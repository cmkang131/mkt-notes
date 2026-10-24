
(function () {
  "use strict";

  if (!window.V6 || typeof window.V6.register !== "function") return;

  var V6 = window.V6;
  var INK = "#1a1a1a";
  var RED = "#9e2b25";
  var GRID = "#e8e6e0";
  var FONT = "'Noto Sans KR',sans-serif";

  // ============================================================
  // Load-order wrapper
  // ============================================================

  if (!V6.__extraRegisterWrapped) {
    var originalRegister = V6.register.bind(V6);

    function mountOne(el, name, fn) {
      if (!el || el.__v6m) return;

      el.__v6m = true;

      try {
        var cfg = {};
        var raw = el.getAttribute("data-config");

        if (raw) cfg = JSON.parse(raw);

        el.style.display = "";
        fn(el, cfg || {});
      } catch (err) {
        console.error("[V6] " + name, err);
        el.innerHTML = "";

        var error = document.createElement("div");
        error.textContent = "위젯 오류";
        error.style.cssText =
          "color:" + RED + ";font:12px " + FONT +
          ";padding:12px;border:1px solid " + RED;
        el.appendChild(error);
      }
    }

    V6.register = function (name, fn) {
      var wrapped = function (el, cfg) {
        if (!el || el.__v6m) return;
        el.__v6m = true;

        try {
          el.style.display = "";
          fn(el, cfg || {});
        } catch (err) {
          console.error("[V6] " + name, err);
          el.innerHTML = "";

          var error = document.createElement("div");
          error.textContent = "위젯 오류";
          error.style.cssText =
            "color:" + RED + ";font:12px " + FONT +
            ";padding:12px;border:1px solid " + RED;
          el.appendChild(error);
        }
      };

      originalRegister(name, wrapped);

      function mountExisting() {
        var nodes = document.querySelectorAll(".v6-widget");

        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].getAttribute("data-widget") === name) {
            mountOne(nodes[i], name, fn);
          }
        }
      }

      mountExisting();

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          mountExisting,
          { once: true }
        );
      }
    };

    V6.__extraRegisterWrapped = true;
  }

  // ============================================================
  // Shared presentation utilities
  // ============================================================

  function node(tag, parent, css, content) {
    var el = document.createElement(tag);

    if (css) el.style.cssText = css;
    if (content !== undefined) el.textContent = content;

    parent.appendChild(el);
    return el;
  }

  function fmt(x, digits) {
    if (!Number.isFinite(x)) return "—";
    if (Math.abs(x) < 1e-10) x = 0;

    return x.toLocaleString("en-US", {
      maximumFractionDigits: digits === undefined ? 2 : digits
    });
  }

  function signed(x, digits) {
    return (x < 0 ? "− " : "+ ") + fmt(Math.abs(x), digits);
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function box(parent) {
    return node(
      "div",
      parent,
      "border:1px solid " + INK +
      ";padding:13px 15px;margin:12px 0;" +
      "background:#fff;color:" + INK +
      ";font:13px/1.8 " + FONT + ";"
    );
  }

  function section(parent, title) {
    return node(
      "div",
      parent,
      "font:700 14px/1.5 " + FONT +
      ";color:" + INK +
      ";margin:22px 0 9px;",
      title
    );
  }

  function explanation(parent, text) {
    return node(
      "div",
      parent,
      "font:12px/1.8 " + FONT +
      ";color:" + INK +
      ";padding:8px 0;",
      text
    );
  }

  function controls(parent) {
    return node(
      "div",
      parent,
      "display:grid;" +
      "grid-template-columns:repeat(auto-fit,minmax(230px,1fr));" +
      "gap:13px 22px;margin:12px 0 18px;"
    );
  }

  function addSlider(parent, label, min, max, value, step, format, update) {
    var wrap = node(
      "label",
      parent,
      "display:block;min-width:0;color:" + INK +
      ";font:12px/1.6 " + FONT + ";"
    );

    var head = node(
      "div",
      wrap,
      "display:flex;align-items:baseline;" +
      "justify-content:space-between;gap:8px;margin-bottom:5px;"
    );

    node(
      "span",
      head,
      "font-weight:600;",
      label
    );

    var number = node(
      "strong",
      head,
      "white-space:nowrap;font-variant-numeric:tabular-nums;",
      format(value)
    );

    var input = node(
      "input",
      wrap,
      "display:block;width:100%;height:34px;" +
      "box-sizing:border-box;margin:0;cursor:pointer;" +
      "accent-color:" + RED + ";"
    );

    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.setAttribute("aria-label", label);

    input.addEventListener("input", function () {
      number.textContent = format(+input.value);
      update();
    });

    return {
      get: function () { return +input.value; },
      set: function (v) {
        input.value = String(v);
        number.textContent = format(+input.value);
      }
    };
  }

  function button(parent, label, callback) {
    var b = node(
      "button",
      parent,
      "appearance:none;min-height:44px;padding:10px 16px;" +
      "box-sizing:border-box;border:1px solid " + INK +
      ";border-radius:0;background:#fff;color:" + INK +
      ";font:600 12px/1.5 " + FONT +
      ";cursor:pointer;transition:background .12s,color .12s;",
      label
    );

    b.type = "button";

    b.addEventListener("mouseenter", function () {
      if (b.getAttribute("aria-pressed") !== "true") {
        b.style.background = INK;
        b.style.color = "#fff";
      }
    });

    b.addEventListener("mouseleave", function () {
      var active = b.getAttribute("aria-pressed") === "true";
      b.style.background = active ? INK : "#fff";
      b.style.color = active ? "#fff" : INK;
    });

    b.addEventListener("click", callback);
    return b;
  }

  function setActive(buttons, selected) {
    buttons.forEach(function (b, i) {
      var active = i === selected;

      b.setAttribute("aria-pressed", String(active));
      b.style.background = active ? INK : "#fff";
      b.style.color = active ? "#fff" : INK;
    });
  }

  function plotCanvas(parent, height) {
    // Use the existing V6 canvas helper.
    // Fit the logical canvas to the host width so the full chart
    // (current-price point and right axis end) is visible by default on
    // phones and desktop. Previously fixed at 720 CSS px with horizontal
    // pan, which hid the key markers off-screen by default.
    var host = node(
      "div",
      parent,
      "width:100%;overflow-x:auto;overflow-y:hidden;" +
      "box-sizing:border-box;"
    );

    var hostW = host.clientWidth || 720;
    var W = Math.max(320, Math.min(720, Math.floor(hostW)));

    var canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = height * 2;
    canvas.style.cssText =
      "display:block;width:" + W + "px;height:" + height +
      "px;max-width:none;background:#fff;";

    host.appendChild(canvas);

    // Labels keep their 11px size at every width: only the plot area
    // compresses, so text stays readable without panning.
    var ctx = canvas.getContext("2d");
    ctx.setTransform(2, 0, 0, 2, 0, 0);

    function clear() {
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, W, height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, height);
    }

    return {
      canvas: canvas,
      ctx: ctx,
      W: W,
      H: height,
      clear: clear
    };
  }

  function chart(p, xr, yr, options) {
    var ctx = p.ctx;
    var W = p.W;
    var H = p.H;
    var left = 72;
    var right = 27;
    var top = 40;
    var bottom = 52;

    var pw = W - left - right;
    var ph = H - top - bottom;

    var xmin = xr[0], xmax = xr[1];
    var ymin = yr[0], ymax = yr[1];

    if (xmax <= xmin) xmax = xmin + 1;
    if (ymax <= ymin) ymax = ymin + 1;

    var px = function (x) {
      return left + (x - xmin) / (xmax - xmin) * pw;
    };

    var py = function (y) {
      return top + ph - (y - ymin) / (ymax - ymin) * ph;
    };

    p.clear();

    ctx.font = "11px " + FONT;
    ctx.lineWidth = 1;
    ctx.textBaseline = "middle";

    for (var i = 0; i <= 5; i++) {
      var x = xmin + (xmax - xmin) * i / 5;
      var y = ymin + (ymax - ymin) * i / 5;

      ctx.strokeStyle = GRID;
      ctx.beginPath();
      ctx.moveTo(px(x), top);
      ctx.lineTo(px(x), top + ph);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(left, py(y));
      ctx.lineTo(left + pw, py(y));
      ctx.stroke();

      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.fillText(fmt(x, 2), px(x), top + ph + 17);

      ctx.textAlign = "right";
      ctx.fillText(fmt(y, 2), left - 9, py(y));
    }

    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.strokeRect(left, top, pw, ph);

    ctx.fillStyle = INK;
    ctx.font = "600 12px " + FONT;
    ctx.textAlign = "left";
    ctx.fillText(options.title || "", left, 17);

    ctx.font = "11px " + FONT;
    ctx.textAlign = "center";
    ctx.fillText(options.xLabel || "", left + pw / 2, H - 12);

    ctx.save();
    ctx.translate(15, top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(options.yLabel || "", 0, 0);
    ctx.restore();

    return {
      ctx: ctx,
      px: px,
      py: py,
      left: left,
      right: left + pw,
      top: top,
      bottom: top + ph,
      xmin: xmin,
      xmax: xmax,
      ymin: ymin,
      ymax: ymax
    };
  }

  function curve(g, fn, x0, x1, color, width, dash) {
    var ctx = g.ctx;
    var n = 400;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      g.left,
      g.top,
      g.right - g.left,
      g.bottom - g.top
    );
    ctx.clip();

    ctx.beginPath();
    ctx.lineWidth = width || 2.3;
    ctx.strokeStyle = color || INK;
    ctx.setLineDash(dash || []);

    var drawing = false;

    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n;
      var y = fn(x);

      if (!Number.isFinite(y)) {
        drawing = false;
        continue;
      }

      var sx = g.px(x);
      var sy = g.py(y);

      if (!drawing) {
        ctx.moveTo(sx, sy);
        drawing = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  function dot(g, x, y, color, radius) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    var sx = g.px(x);
    var sy = g.py(y);

    if (
      sx < g.left - 1 || sx > g.right + 1 ||
      sy < g.top - 1 || sy > g.bottom + 1
    ) return;

    var ctx = g.ctx;
    ctx.beginPath();
    ctx.arc(sx, sy, radius || 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = color || RED;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }

  function vertical(g, x, color, dash) {
    if (!Number.isFinite(x) || x < g.xmin || x > g.xmax) return;

    var ctx = g.ctx;
    ctx.save();
    ctx.strokeStyle = color || RED;
    ctx.lineWidth = 1.6;
    ctx.setLineDash(dash || [5, 4]);
    ctx.beginPath();
    ctx.moveTo(g.px(x), g.top);
    ctx.lineTo(g.px(x), g.bottom);
    ctx.stroke();
    ctx.restore();
  }

  function chartLabel(g, x, y, text, color, align) {
    var ctx = g.ctx;
    ctx.save();
    ctx.fillStyle = color || INK;
    ctx.font = "600 11px " + FONT;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function swatch(ctx, x, y, color, text, dashed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 24, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK;
    ctx.font = "11px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 30, y);
    ctx.restore();
  }

  // ============================================================
  // Widget 1: Demand and price elasticity
  // ============================================================

  V6.register("demand-elasticity", function (el, cfg) {
    var root = node(
      "div",
      el,
      "background:#fff;color:" + INK +
      ";font-family:" + FONT +
      ";max-width:100%;box-sizing:border-box;"
    );

    V6.title(root, "Demand(수요)와 Price Elasticity(가격탄력성)");

    explanation(
      root,
      "소비자의 WTP(지불의사금액) 분포가 수요곡선을 결정합니다. " +
      "수요곡선의 높이는 해당 수량을 판매할 수 있는 최고 가격입니다. " +
      "가격과 탄력성을 조절하고 매출·이익 최적점을 비교하세요."
    );

    var state = { model: "linear" };
    var inputs = controls(root);

    var p0 = addSlider(
      inputs, "현재 가격 p₀",
      1, 15, 5, 0.05,
      function (v) { return "$" + fmt(v, 2); },
      render
    );

    var q0 = addSlider(
      inputs, "현재 수요 q₀",
      0.5, 15, 6, 0.1,
      function (v) { return fmt(v, 1) + "백만 개"; },
      render
    );

    var eps = addSlider(
      inputs, "가격탄력성 ε",
      -4, -0.2, -2, 0.05,
      function (v) { return fmt(v, 2); },
      render
    );

    var cost = addSlider(
      inputs, "단위원가 c",
      0.5, 10, 2, 0.05,
      function (v) { return "$" + fmt(v, 2); },
      render
    );

    var actions = node(
      "div",
      root,
      "display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 14px;"
    );

    var linearBtn = button(
      actions,
      "Linear(선형 수요)",
      function () {
        state.model = "linear";
        setActive([linearBtn, powerBtn], 0);
        render();
      }
    );

    var powerBtn = button(
      actions,
      "Constant Elasticity(고정탄력성 수요)",
      function () {
        state.model = "power";
        setActive([linearBtn, powerBtn], 1);
        render();
      }
    );

    var resetBtn = button(actions, "예제값 초기화", function () {
      p0.set(5);
      q0.set(6);
      eps.set(-2);
      cost.set(2);
      state.model = "linear";
      setActive([linearBtn, powerBtn], 0);
      render();
    });

    setActive([linearBtn, powerBtn], 0);

    var formulaBox = box(root);

    section(root, "01 — Demand Curve(수요곡선)");
    var demandPlot = plotCanvas(root, 320);
    var demandInfo = box(root);

    section(root, "02 — Total Revenue(총매출)와 탄력성");
    var revenuePlot = plotCanvas(root, 320);
    var revenueInfo = box(root);

    section(root, "03 — Profit(이익)와 최적 가격");
    var profitPlot = plotCanvas(root, 320);
    var profitInfo = box(root);

    function modelData() {
      var p = p0.get();
      var q = q0.get();
      var e = eps.get();
      var c = cost.get();

      var p1 = 1.01 * p;
      var q1Approx = q * (1 + e / 100);

      // Teaching method: fit a line through the initial point
      // and the 1%-price-increase approximation point.
      var b = (q - q1Approx) / (p1 - p);
      var a = q + b * p;

      // Constant-elasticity model calibrated to (p0,q0).
      var k = q / Math.pow(p, e);

      var linear = state.model === "linear";

      var demand = linear
        ? function (price) {
            return Math.max(0, a - b * price);
          }
        : function (price) {
            return price > 0 ? k * Math.pow(price, e) : NaN;
          };

      var choke = a / b;

      var elasticity = linear
        ? function (price) {
            var quantity = a - b * price;
            return quantity > 0 ? -b * price / quantity : NaN;
          }
        : function () { return e; };

      var revenue = function (price) {
        var quantity = demand(price);
        return Number.isFinite(quantity)
          ? price * quantity
          : NaN;
      };

      var profit = function (price) {
        var quantity = demand(price);
        return Number.isFinite(quantity)
          ? (price - c) * quantity
          : NaN;
      };

      var pStar = null;
      var status = "";

      if (linear) {
        // For p >= 0 and nonnegative demand, the constrained
        // optimum is the unconstrained stationary point clipped
        // to the feasible sales interval.
        pStar = clamp(
          (a + b * c) / (2 * b),
          0,
          choke
        );

        if (c >= choke) {
          status =
            "단위원가가 수요의 최대 지불의사가격 이상이므로 " +
            "양의 이익을 내는 판매가격이 없습니다. 최적 이익은 $0M입니다.";
        } else {
          status =
            "선형 수요의 이익함수를 미분하면 " +
            "p* = (a + bc)/(2b)입니다.";
        }
      } else if (e < -1) {
        pStar = c * e / (e + 1);
        status =
          "ε < −1이므로 p* = cε/(ε + 1)에 " +
          "유일한 내부 이익 극대점이 있습니다.";
      } else {
        status =
          "−1 ≤ ε < 0에서는 이 모형의 양의 가격 전 구간에 " +
          "유한한 이익 극대 가격이 없습니다. " +
          "ε = −1에서는 가격이 무한히 커질 때 이익이 상한에 " +
          "접근하고, −1 < ε < 0에서는 이익이 무한히 증가합니다.";
      }

      return {
        p: p,
        q: q,
        e: e,
        c: c,
        p1: p1,
        q1: q1Approx,
        a: a,
        b: b,
        k: k,
        choke: choke,
        linear: linear,
        demand: demand,
        elasticity: elasticity,
        revenue: revenue,
        profit: profit,
        pStar: pStar,
        status: status
      };
    }

    function demandChart(m) {
      var upper = m.linear
        ? Math.max(m.choke * 1.08, m.p1 * 1.25)
        : Math.max(m.p * 3, m.pStar ? m.pStar * 1.3 : 0);

      var lower = m.linear
        ? 0
        : Math.max(0.1, m.p * 0.45);

      var maxQ = Math.max(
        m.q,
        m.q1,
        m.demand(lower)
      ) * 1.18;

      var g = chart(
        demandPlot,
        [lower, upper],
        [0, maxQ],
        {
          title: "가격에 따른 구매수량",
          xLabel: "Price(가격), $",
          yLabel: "Demand(수요), 백만 개"
        }
      );

      curve(g, m.demand, lower, upper, INK, 2.6);

      dot(g, m.p, m.q, RED, 5.5);
      dot(g, m.p1, m.q1, INK, 4.5);

      swatch(g.ctx, 398, 17, RED, "현재 가격");
      swatch(g.ctx, 527, 17, INK, "1% 상승 추정점");

      demandInfo.innerHTML =
        "<strong>현재 점</strong> (" +
          fmt(m.p, 2) + ", " + fmt(m.q, 3) + ")" +
        "　→　<strong>1% 상승 추정점</strong> (" +
          fmt(m.p1, 3) + ", " + fmt(m.q1, 4) + ")" +
        "<br>" +
        (m.linear
          ? "<strong>선형 수요:</strong> q = " +
            fmt(m.a, 4) + " − " + fmt(m.b, 4) + "p"
          : "<strong>거듭제곱 수요:</strong> q = " +
            fmt(m.k, 4) + " × p<sup>" +
            fmt(m.e, 2) + "</sup>") +
        "<br><span style='font-size:12px'>" +
        (m.linear
          ? "수량 q는 백만 개. 두 점을 잇는 직선으로 수요를 추정합니다."
          : "수량 q는 백만 개. 거듭제곱 곡선은 현재 점과 ε로 " +
            "정확히 결정됩니다. 검정 점은 강의의 1차 근사값이므로 " +
            "곡선상의 실제 1% 상승 수요와 약간 다를 수 있습니다.") +
        "</span>";
    }

    function revenueChart(m) {
      var unitP = m.linear ? m.a / (2 * m.b) : null;

      var xmax = m.linear
        ? Math.max(m.choke * 1.05, m.p1 * 1.2)
        : Math.max(
            m.p * 3,
            m.pStar ? m.pStar * 1.5 : 0
          );

      var xmin = m.linear ? 0 : Math.max(0.1, m.p * 0.45);

      var ymax = 0;

      for (var i = 0; i <= 400; i++) {
        var x = xmin + (xmax - xmin) * i / 400;
        ymax = Math.max(ymax, m.revenue(x) || 0);
      }

      var g = chart(
        revenuePlot,
        [xmin, xmax],
        [0, Math.max(0.1, ymax * 1.22)],
        {
          title: "TR(p) = p × q(p)",
          xLabel: "Price(가격), $",
          yLabel: "Revenue(매출), $M"
        }
      );

      if (m.linear) {
        var boundary = clamp(unitP, xmin, xmax);

        // Inelastic region: lower prices, before revenue maximum.
        g.ctx.save();
        g.ctx.fillStyle = GRID;
        g.ctx.globalAlpha = 0.65;
        g.ctx.fillRect(
          g.left,
          g.top,
          Math.max(0, g.px(boundary) - g.left),
          g.bottom - g.top
        );
        g.ctx.restore();

        curve(
          g, m.revenue,
          xmin, Math.min(unitP, xmax),
          INK, 2.6
        );

        curve(
          g, m.revenue,
          Math.max(unitP, xmin), xmax,
          RED, 2.6
        );

        vertical(g, unitP, RED);
        dot(g, unitP, m.revenue(unitP), RED, 6);

        chartLabel(
          g,
          g.left + 14,
          g.top + 17,
          "비탄력 |ε| < 1",
          INK
        );

        chartLabel(
          g,
          g.right - 14,
          g.top + 17,
          "탄력적 |ε| > 1",
          RED,
          "right"
        );

        revenueInfo.innerHTML =
          "<strong>단위탄력 가격:</strong> $" +
          fmt(unitP, 3) +
          "　|　<strong>매출 최대:</strong> $" +
          fmt(m.revenue(unitP), 3) + "M" +
          "<br><strong>현재 가격에서 ε:</strong> " +
          fmt(m.elasticity(m.p), 3) +
          "　|　<strong>현재 매출:</strong> $" +
          fmt(m.revenue(m.p), 3) + "M" +
          "<br><span style='font-size:12px'>" +
          "선형 수요에서는 p = a/(2b)에서 ε = −1이고 " +
          "총매출이 최대입니다. 단위탄력 지점 왼쪽에서는 " +
          "가격 인상이 매출을 늘리고, 오른쪽에서는 줄입니다." +
          "</span>";
      } else {
        curve(g, m.revenue, xmin, xmax, RED, 2.6);

        var regime = m.e < -1
          ? "탄력적 |ε| > 1"
          : Math.abs(m.e + 1) < 1e-9
            ? "단위탄력 |ε| = 1"
            : "비탄력 |ε| < 1";

        chartLabel(
          g,
          g.left + 13,
          g.top + 17,
          regime,
          RED
        );

        var message;

        if (Math.abs(m.e + 1) < 1e-9) {
          message =
            "ε = −1이면 모든 양의 가격에서 TR이 일정합니다. " +
            "매출 최대 가격은 유일하지 않습니다.";
        } else if (m.e < -1) {
          message =
            "ε < −1이면 전 가격 구간이 탄력적이므로 " +
            "가격을 올릴수록 매출이 감소합니다. " +
            "양의 가격 범위에 단위탄력 지점은 없습니다.";
        } else {
          message =
            "−1 < ε < 0이면 전 가격 구간이 비탄력적이므로 " +
            "가격을 올릴수록 매출이 증가합니다. " +
            "양의 가격 범위에 단위탄력 지점은 없습니다.";
        }

        revenueInfo.innerHTML =
          "<strong>고정 가격탄력성:</strong> " +
          fmt(m.e, 2) +
          "　|　<strong>현재 매출:</strong> $" +
          fmt(m.revenue(m.p), 3) + "M" +
          "<br><span style='font-size:12px'>" +
          message +
          "</span>";
      }

      dot(g, m.p, m.revenue(m.p), INK, 4.5);
    }

    function profitChart(m) {
      var xmin = m.linear
        ? 0
        : Math.max(0.1, m.p * 0.45);

      var xmax = m.linear
        ? Math.max(
            m.choke * 1.12,
            m.c * 1.1,
            m.p * 1.25
          )
        : Math.max(
            m.p * 3,
            m.c * 2,
            m.pStar ? m.pStar * 1.5 : 0
          );

      var lo = 0, hi = 0;

      for (var i = 0; i <= 400; i++) {
        var x = xmin + (xmax - xmin) * i / 400;
        var value = m.profit(x);

        if (Number.isFinite(value)) {
          lo = Math.min(lo, value);
          hi = Math.max(hi, value);
        }
      }

      if (m.pStar !== null) {
        hi = Math.max(hi, m.profit(m.pStar));
      }

      var padding = Math.max(1, (hi - lo) * 0.13);

      var g = chart(
        profitPlot,
        [xmin, xmax],
        [lo - padding, hi + padding],
        {
          title: "π(p) = (p − c) × q(p)",
          xLabel: "Price(가격), $",
          yLabel: "Profit(이익), $M"
        }
      );

      if (g.ymin <= 0 && g.ymax >= 0) {
        g.ctx.save();
        g.ctx.setLineDash([4, 4]);
        g.ctx.strokeStyle = GRID;
        g.ctx.beginPath();
        g.ctx.moveTo(g.left, g.py(0));
        g.ctx.lineTo(g.right, g.py(0));
        g.ctx.stroke();
        g.ctx.restore();
      }

      curve(g, m.profit, xmin, xmax, INK, 2.6);

      dot(g, m.p, m.profit(m.p), INK, 4.5);

      if (m.pStar !== null) {
        vertical(g, m.pStar, RED);
        dot(g, m.pStar, m.profit(m.pStar), RED, 6);
      }

      swatch(g.ctx, 437, 17, RED, "최적 가격 p*");

      if (m.pStar !== null) {
        var pBest = m.pStar;
        var qBest = m.demand(pBest);
        var profitBest = m.profit(pBest);

        profitInfo.innerHTML =
          "<strong>최적 가격 p*:</strong> $" +
          fmt(pBest, 4) +
          "　|　<strong>최적 수요:</strong> " +
          fmt(qBest, 4) + "백만 개" +
          "<br><strong>최대 이익:</strong> $" +
          fmt(profitBest, 4) + "M" +
          "　|　<strong>현재 이익:</strong> $" +
          fmt(m.profit(m.p), 4) + "M" +
          "<br><span style='font-size:12px'>" +
          m.status +
          "</span>";
      } else {
        profitInfo.innerHTML =
          "<strong>유한한 최적 가격 없음</strong>" +
          "　|　<strong>현재 이익:</strong> $" +
          fmt(m.profit(m.p), 4) + "M" +
          "<br><span style='font-size:12px'>" +
          m.status +
          "</span>";
      }
    }

    function render() {
      var m = modelData();

      formulaBox.innerHTML =
        "<strong>가격탄력성</strong> ε = (dq/dp) × (p/q)" +
        "　|　<strong>매출</strong> TR = pq" +
        "　|　<strong>이익</strong> π = (p − c)q" +
        "<br><strong>1% 가격 상승 추정:</strong> " +
        "p₁ = 1.01p₀, q₁ ≈ q₀(1 + ε/100)" +
        "<br><span style='font-size:12px'>" +
        "현재 입력 ε은 초기점의 탄력성입니다. " +
        (m.linear
          ? "선형 수요에서는 가격에 따라 탄력성이 변합니다."
          : "고정탄력성 수요에서는 모든 양의 가격에서 ε이 같습니다.") +
        "</span>";

      demandChart(m);
      revenueChart(m);
      profitChart(m);
    }

    render();
  });

  // ============================================================
  // Widget 2: Price skimming versus penetration
  // ============================================================

  V6.register("price-skimming", function (el, cfg) {
    var root = node(
      "div",
      el,
      "background:#fff;color:" + INK +
      ";font-family:" + FONT +
      ";max-width:100%;box-sizing:border-box;"
    );

    V6.title(
      root,
      "Skimming(스키밍) vs Penetration(침투 가격)"
    );

    explanation(
      root,
      "Skimming(스키밍)은 높은 WTP(지불의사금액)를 가진 " +
      "세그먼트부터 판매하고 가격을 단계적으로 낮춥니다. " +
      "Penetration(침투 가격)은 처음부터 낮은 가격으로 " +
      "구매 가능한 고객을 빠르게 확보합니다."
    );

    var assumptionBox = box(root);
    assumptionBox.innerHTML =
      "<strong>Illustrative(예시용) 모형 — 실제 강의 실측값 아님</strong>" +
      "<br>세그먼트별 WTP는 동일 세그먼트 내 모든 고객의 " +
      "최대 지불의사금액으로 가정합니다. 고객은 최대 한 번 구매하며, " +
      "출시 후 시장에 새 고객은 유입되지 않습니다." +
      "<br>가격이 WTP 이하이고 아직 구매하지 않은 고객은 " +
      "그 기간에 전원 구매합니다. 재구매·구매 지연·원가·할인·" +
      "경쟁 반응·기존 구매자의 환불 및 가격보장은 제외합니다." +
      "<br><strong>모든 가격·규모·기간 설정은 학습용 " +
      "illustrative(예시용) 값입니다.</strong>" +
      "<br><strong>구조적 결과:</strong> 같은 고객 집단에서 " +
      "세그먼트별 WTP를 완전히 회수하는 이상화된 스키밍의 " +
      "총매출은 어떤 슬라이더 설정에서도 단일 침투 가격의 " +
      "총매출 이상입니다 (약우세). 침투 가격의 실제 강점인 " +
      "빠른 시장 점유, 확산·입소문, 경쟁자 진입 차단, " +
      "규모의 경제는 이 모형에 없습니다. 격차가 언제 " +
      "커지는지 슬라이더로 확인해 보세요.";

    var inputs = controls(root);

    var earlyW = addSlider(
      inputs, "얼리어답터 WTP",
      20, 150, 120, 5,
      function (v) { return "$" + fmt(v, 0); },
      render
    );

    var earlyN = addSlider(
      inputs, "얼리어답터 규모",
      1, 100, 30, 1,
      function (v) { return fmt(v, 0) + "천 명"; },
      render
    );

    var middleW = addSlider(
      inputs, "중간 세그먼트 WTP",
      20, 150, 80, 5,
      function (v) { return "$" + fmt(v, 0); },
      render
    );

    var middleN = addSlider(
      inputs, "중간 세그먼트 규모",
      1, 100, 50, 1,
      function (v) { return fmt(v, 0) + "천 명"; },
      render
    );

    var budgetW = addSlider(
      inputs, "가격민감 세그먼트 WTP",
      20, 150, 40, 5,
      function (v) { return "$" + fmt(v, 0); },
      render
    );

    var budgetN = addSlider(
      inputs, "가격민감 세그먼트 규모",
      1, 100, 80, 1,
      function (v) { return fmt(v, 0) + "천 명"; },
      render
    );

    var penetration = addSlider(
      inputs, "Penetration(침투) 가격",
      10, 150, 35, 5,
      function (v) { return "$" + fmt(v, 0); },
      render
    );

    var actions = node(
      "div",
      root,
      "display:flex;flex-wrap:wrap;gap:8px;margin:7px 0 13px;"
    );

    button(actions, "예제값 초기화", function () {
      earlyW.set(120);
      earlyN.set(30);
      middleW.set(80);
      middleN.set(50);
      budgetW.set(40);
      budgetN.set(80);
      penetration.set(35);
      render();
    });

    button(actions, "WTP 격차 축소", function () {
      earlyW.set(60);
      middleW.set(55);
      budgetW.set(50);
      penetration.set(50);
      render();
    });

    button(actions, "WTP 격차 확대", function () {
      earlyW.set(150);
      middleW.set(90);
      budgetW.set(30);
      penetration.set(30);
      render();
    });

    var summary = box(root);

    section(root, "01 — 기간별 가격 경로 및 구매 세그먼트");

    var pricePlot = plotCanvas(root, 340);
    var priceInfo = box(root);

    section(root, "02 — Cumulative Revenue(누적 매출)");

    var revenuePlot = plotCanvas(root, 330);
    var resultInfo = box(root);

    function simulation() {
      var segments = [
        {
          id: "early",
          name: "얼리어답터",
          wtp: earlyW.get(),
          size: earlyN.get()
        },
        {
          id: "middle",
          name: "중간",
          wtp: middleW.get(),
          size: middleN.get()
        },
        {
          id: "budget",
          name: "가격민감",
          wtp: budgetW.get(),
          size: budgetN.get()
        }
      ];

      // Price ranks always follow actual WTP, even if sliders
      // reverse the original segment ordering.
      var sorted = segments.slice().sort(function (a, b) {
        return b.wtp - a.wtp;
      });

      var skimPrices = sorted.map(function (s) {
        return s.wtp;
      });

      var penetrationPrice = penetration.get();

      var purchasedSkim = new Set();
      var purchasedPen = new Set();

      var skimSales = [];
      var penSales = [];
      var skimRevenue = [0];
      var penRevenue = [0];

      for (var t = 0; t < 3; t++) {
        var priceS = skimPrices[t];

        var buyersS = segments.filter(function (s) {
          return !purchasedSkim.has(s.id) && s.wtp >= priceS;
        });

        buyersS.forEach(function (s) {
          purchasedSkim.add(s.id);
        });

        var quantityS = buyersS.reduce(function (sum, s) {
          return sum + s.size;
        }, 0);

        skimSales.push({
          price: priceS,
          buyers: buyersS,
          quantity: quantityS,
          revenue: priceS * quantityS / 1000
        });

        skimRevenue.push(
          skimRevenue[t] + priceS * quantityS / 1000
        );

        var buyersP = segments.filter(function (s) {
          return (
            !purchasedPen.has(s.id) &&
            s.wtp >= penetrationPrice
          );
        });

        buyersP.forEach(function (s) {
          purchasedPen.add(s.id);
        });

        var quantityP = buyersP.reduce(function (sum, s) {
          return sum + s.size;
        }, 0);

        penSales.push({
          price: penetrationPrice,
          buyers: buyersP,
          quantity: quantityP,
          revenue: penetrationPrice * quantityP / 1000
        });

        penRevenue.push(
          penRevenue[t] + penetrationPrice * quantityP / 1000
        );
      }

      var totalN = segments.reduce(function (sum, s) {
        return sum + s.size;
      }, 0);

      return {
        segments: segments,
        sorted: sorted,
        skimPrices: skimPrices,
        penetrationPrice: penetrationPrice,
        skimSales: skimSales,
        penSales: penSales,
        skimRevenue: skimRevenue,
        penRevenue: penRevenue,
        totalN: totalN
      };
    }

    function stepLine(g, prices, color, width) {
      var ctx = g.ctx;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 3;
      ctx.lineJoin = "miter";
      ctx.beginPath();

      // Period t occupies [t-0.5,t+0.5].
      ctx.moveTo(g.px(0.5), g.py(prices[0]));

      for (var t = 0; t < 3; t++) {
        var boundary = t + 1.5;

        ctx.lineTo(
          g.px(boundary),
          g.py(prices[t])
        );

        if (t < 2) {
          ctx.lineTo(
            g.px(boundary),
            g.py(prices[t + 1])
          );
        }
      }

      ctx.stroke();
      ctx.restore();
    }

    function priceChart(s) {
      var ymax = Math.max(
        20,
        s.penetrationPrice,
        s.skimPrices[0]
      ) * 1.27;

      var g = chart(
        pricePlot,
        [0.5, 3.5],
        [0, ymax],
        {
          title: "출시 후 기간별 가격",
          xLabel: "Period(기간)",
          yLabel: "Price(가격), $"
        }
      );

      // Period labels drawn on top of standard axes.
      g.ctx.save();
      g.ctx.fillStyle = "#fff";
      g.ctx.fillRect(g.left, g.bottom + 4, g.right - g.left, 31);
      g.ctx.font = "600 12px " + FONT;
      g.ctx.textAlign = "center";
      g.ctx.fillStyle = INK;

      for (var t = 1; t <= 3; t++) {
        g.ctx.fillText(
          "기간 " + t,
          g.px(t),
          g.bottom + 18
        );
      }
      g.ctx.restore();

      // Black staircase: skimming.
      stepLine(g, s.skimPrices, INK, 3.2);

      // Red horizontal path: penetration.
      stepLine(
        g,
        [
          s.penetrationPrice,
          s.penetrationPrice,
          s.penetrationPrice
        ],
        RED,
        2.8
      );

      for (var i = 0; i < 3; i++) {
        dot(
          g,
          i + 1,
          s.skimPrices[i],
          INK,
          4.5
        );

        dot(
          g,
          i + 1,
          s.penetrationPrice,
          RED,
          4
        );
      }

      swatch(g.ctx, 370, 17, INK, "Skimming(스키밍)");
      swatch(g.ctx, 540, 17, RED, "Penetration(침투)");

      var html = "<strong>기간별 신규 구매 세그먼트</strong>";

      for (var j = 0; j < 3; j++) {
        var skimNames = s.skimSales[j].buyers.map(function (v) {
          return v.name;
        }).join(", ") || "없음";

        var penNames = s.penSales[j].buyers.map(function (v) {
          return v.name;
        }).join(", ") || "없음";

        html +=
          "<br><strong>기간 " + (j + 1) + "</strong>　" +
          "스키밍 $" + fmt(s.skimSales[j].price, 0) +
          " → " + skimNames +
          " (" + fmt(s.skimSales[j].quantity, 0) + "천 명)" +
          "　|　침투 $" + fmt(s.penetrationPrice, 0) +
          " → " + penNames +
          " (" + fmt(s.penSales[j].quantity, 0) + "천 명)";
      }

      html +=
        "<br><span style='font-size:12px'>" +
        "가격이 WTP와 같으면 구매합니다. " +
        "동일 WTP의 세그먼트들은 첫 해당 가격 기간에 함께 구매하며, " +
        "이후 중복 구매하지 않습니다." +
        "</span>";

      priceInfo.innerHTML = html;
    }

    function cumulativeChart(s) {
      var skim = s.skimRevenue;
      var pen = s.penRevenue;

      var ymax = Math.max(
        0.1,
        skim[3],
        pen[3]
      ) * 1.23;

      var g = chart(
        revenuePlot,
        [0, 3],
        [0, ymax],
        {
          title: "기간 종료 시점의 누적 매출",
          xLabel: "Elapsed Periods(경과 기간)",
          yLabel: "Cumulative Revenue(누적 매출), $M"
        }
      );

      function drawSeries(values, color) {
        var ctx = g.ctx;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.8;
        ctx.beginPath();

        values.forEach(function (v, i) {
          if (i === 0) {
            ctx.moveTo(g.px(i), g.py(v));
          } else {
            ctx.lineTo(g.px(i), g.py(v));
          }
        });

        ctx.stroke();
        ctx.restore();

        values.forEach(function (v, i) {
          dot(g, i, v, color, 4.5);
        });
      }

      drawSeries(skim, INK);
      drawSeries(pen, RED);

      swatch(g.ctx, 370, 17, INK, "Skimming(스키밍)");
      swatch(g.ctx, 540, 17, RED, "Penetration(침투)");

      var diff = skim[3] - pen[3];
      var winner = Math.abs(diff) < 1e-9
        ? "동일"
        : diff > 0
          ? "Skimming(스키밍)"
          : "Penetration(침투 가격)";

      var ratio = pen[3] > 0
        ? (skim[3] / pen[3])
        : Infinity;

      var captureS = s.skimSales.reduce(function (n, item) {
        return n + item.quantity;
      }, 0);

      var captureP = s.penSales.reduce(function (n, item) {
        return n + item.quantity;
      }, 0);

      var condition =
        s.segments.reduce(function (sum, seg) {
          return sum + seg.wtp * seg.size / 1000;
        }, 0);

      // Because the skimming path visits every distinct WTP rank
      // and everyone buys at their own WTP, its final revenue is
      // exactly the sum of WTP_i * size_i.
      // Penetration sells each eligible cohort once at a fixed price.
      var eligibleN = s.segments.reduce(function (sum, seg) {
        return sum +
          (seg.wtp >= s.penetrationPrice ? seg.size : 0);
      }, 0);

      var penTotal = s.penetrationPrice * eligibleN / 1000;

      resultInfo.innerHTML =
        "<strong>최종 Skimming(스키밍) 누적 매출:</strong> $" +
        fmt(skim[3], 3) + "M" +
        "<br><strong>최종 Penetration(침투) 누적 매출:</strong> $" +
        fmt(pen[3], 3) + "M" +
        "<br><strong>차이(스키밍 − 침투):</strong> " +
        (diff >= 0 ? "+" : "−") +
        "$" + fmt(Math.abs(diff), 3) + "M" +
        "　|　<strong>우세 전략:</strong> " + winner +
        "<br><strong>스키밍/침투 매출 비:</strong> " +
        (Number.isFinite(ratio) ? fmt(ratio, 3) + "배" : "정의 불가") +
        "<br><strong>판매량:</strong> 스키밍 " +
        fmt(captureS, 0) + "천 명 / 침투 " +
        fmt(captureP, 0) + "천 명" +
        " (전체 " + fmt(s.totalN, 0) + "천 명)" +
        "<br><span style='font-size:12px'>" +
        "이 모형에서 스키밍의 전체 매출은 " +
        "Σ(WTPᵢ × 규모ᵢ) = $" + fmt(condition, 3) + "M, " +
        "침투의 전체 매출은 Pₚ × Σ(규모ᵢ : WTPᵢ ≥ Pₚ) = $" +
        fmt(penTotal, 3) + "M입니다." +
        "</span>";
    }

    function render() {
      var s = simulation();

      var spread =
        s.sorted[0].wtp - s.sorted[2].wtp;

      var avgWTP =
        s.segments.reduce(function (sum, seg) {
          return sum + seg.wtp * seg.size;
        }, 0) / s.totalN;

      var skim = s.skimRevenue[3];
      var pen = s.penRevenue[3];

      // Structural fact of this idealized model: skimming sells
      // every segment at its own WTP, so its total revenue equals
      // the full WTP sum and never falls below any single
      // penetration price. Say so explicitly instead of implying
      // a reachable penetration win.
      var conclusion;

      if (skim > pen + 1e-9) {
        conclusion =
          "현재 설정에서도 스키밍의 누적 매출이 침투보다 큽니다. " +
          "이 모형에서는 우연이 아니라 구조입니다: 스키밍은 모든 " +
          "세그먼트를 각자의 WTP에 팔아 총매출 Σ(WTPᵢ×규모ᵢ)를 " +
          "회수하므로, 어떤 단일 침투 가격보다 항상 크거나 같습니다.";
      } else {
        conclusion =
          "두 전략의 최종 매출이 같습니다. 침투 가격이 모든 " +
          "구매 세그먼트의 WTP를 넘지 않는 경계 경우로, 이 모형에서 " +
          "침투가 도달할 수 있는 최대 매출입니다 (스키밍과 동률).";
      }

      summary.innerHTML =
        "<strong>최고−최저 WTP 격차:</strong> $" +
        fmt(spread, 0) +
        "　|　<strong>고객 수 가중 평균 WTP:</strong> $" +
        fmt(avgWTP, 2) +
        "<br><strong>스키밍 가격 경로:</strong> $" +
        s.skimPrices.map(function (x) {
          return fmt(x, 0);
        }).join(" → $") +
        "<br><strong>침투 가격 경로:</strong> $" +
        fmt(s.penetrationPrice, 0) +
        " → $" + fmt(s.penetrationPrice, 0) +
        " → $" + fmt(s.penetrationPrice, 0) +
        "<br><span style='font-size:12px'>" +
        conclusion +
        " 다만 이 모형은 구매 지연·이탈·시장 확산을 배제하므로 " +
        "현실에서의 전략 우위를 그대로 예측하지는 않습니다." +
        "</span>";

      priceChart(s);
      cumulativeChart(s);
    }

    render();
  });

  // ============================================================
  // Hide unsupported/unmounted widgets after the grace period.
  // ============================================================

  setTimeout(function () {
    var nodes = document.querySelectorAll(".v6-widget");

    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].__v6m) {
        nodes[i].style.display = "none";
      }
    }
  }, 2500);

})();

