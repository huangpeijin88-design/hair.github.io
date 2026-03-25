/* eslint-disable no-console */

/**
 * 配置区（上线前必改）
 *
 * - ENTER_SHORTLINK_URL：进入短链（核心统计入口）
 * - CAMPAIGN_SHORTLINK_URL：投放短链（可选，仅用于记录/运营）
 *
 * 注意：如果 ENTER_SHORTLINK_URL 没填，页面会回退为本地跳转 `analyze.html` 方便自测（但不会统计人数）。
 */
const ENTER_SHORTLINK_URL = "REPLACE_WITH_ENTER_SHORTLINK";
const CAMPAIGN_SHORTLINK_URL = "REPLACE_WITH_CAMPAIGN_SHORTLINK";

function isPlaceholder(url) {
  return !url || url.includes("REPLACE_WITH_");
}

function $(selector) {
  return document.querySelector(selector);
}

function setText(selector, text) {
  const el = $(selector);
  if (el) el.textContent = text;
}

function escapeText(text) {
  return String(text).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function pickWeighted(rng, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

const FACE_SHAPES = [
  {
    id: "oval",
    name: "椭圆脸",
    summary: "可塑性强，重点在“轮廓干净 + 细节提升质感”。",
    tips: ["避免把两侧做得太炸", "顶区适度蓬松更显精神", "干净的鬓角/后颈线很加分"],
    weight: 24,
  },
  {
    id: "round",
    name: "圆脸",
    summary: "视觉目标是“拉长比例 + 两侧更收”。",
    tips: ["两侧别堆厚，优先收紧", "顶区留高度更显脸小", "避免齐刘海把脸压更圆"],
    weight: 22,
  },
  {
    id: "square",
    name: "方脸",
    summary: "重点是“柔化边线 + 提升层次”。",
    tips: ["两侧不要切太直太硬", "用纹理/层次弱化棱角", "分线/刘海可以做柔一点"],
    weight: 18,
  },
  {
    id: "long",
    name: "长脸",
    summary: "目标是“横向平衡 + 前区修饰”。",
    tips: ["前区留些遮挡更平衡", "顶区别太高避免更长", "两侧可略蓬松增加宽度"],
    weight: 18,
  },
  {
    id: "diamond",
    name: "菱形脸",
    summary: "重点是“太阳穴与颧骨的平衡 + 前区更柔和”。",
    tips: ["两侧不要过贴，留一点厚度更协调", "前区轻薄修饰更自然", "后区保持干净，别堆成蘑菇"],
    weight: 18,
  },
];

const STYLES = [
  {
    id: "clean-taper",
    name: "干净渐变（Clean Taper）",
    tags: ["清爽", "低风险", "日常通勤"],
    suited: ["oval", "round", "square", "diamond"],
    reasons: {
      base: ["轮廓干净，显精神", "沟通成本低，容易剪对", "打理简单，第二天也不塌"],
      round: ["两侧收紧更显脸小", "顶部留一点高度拉长比例"],
      square: ["边线不做死板直角，整体更柔和"],
    },
    keywords: ["两侧做渐变收紧", "顶部保留长度", "鬓角干净", "后颈线清晰"],
  },
  {
    id: "soft-side-part",
    name: "柔和侧分（Soft Side Part）",
    tags: ["成熟", "质感", "拍照好看"],
    suited: ["oval", "square", "diamond"],
    reasons: {
      base: ["侧分线条能提精气神", "更容易做出“像样”的质感", "适合约会/拍照场景"],
      square: ["侧分 + 纹理能柔化棱角"],
      diamond: ["前区更好做比例修饰，整体更柔和"],
    },
    keywords: ["自然侧分，不要死分线", "顶部做纹理", "两侧不堆厚", "刘海可轻薄"],
  },
  {
    id: "textured-crop",
    name: "纹理短碎（Textured Crop）",
    tags: ["干练", "显年轻", "纹理感"],
    suited: ["oval", "round", "long"],
    reasons: {
      base: ["纹理让头型更立体", "短但不板，显年轻", "适合发量一般的人"],
      long: ["前区轻微遮挡更平衡脸长"],
      round: ["顶部纹理更容易做高度，拉长比例"],
    },
    keywords: ["顶部做碎感纹理", "两侧稍收", "前区不要齐切", "整体清爽"],
  },
  {
    id: "korean-fringe",
    name: "韩系轻薄刘海（K-Fringe）",
    tags: ["修饰", "氛围感", "显脸小"],
    suited: ["long", "diamond", "square"],
    reasons: {
      base: ["前区修饰最直接", "更适合镜头场景", "轮廓更柔和"],
      square: ["能弱化下颌棱角的存在感"],
      long: ["刘海做横向平衡，避免脸更长"],
    },
    keywords: ["刘海轻薄，不要厚重", "两侧留一点包脸", "顶部别堆太高", "后区干净"],
  },
  {
    id: "two-block-lite",
    name: "轻量两段式（Two-block Lite）",
    tags: ["韩系", "层次", "可进可退"],
    suited: ["oval", "round", "diamond"],
    reasons: {
      base: ["层次让整体更有型", "不需要每天高强度打理", "适合从长发过渡到短发"],
      round: ["两侧不膨胀，比例更好看"],
    },
    keywords: ["两侧做层次别炸开", "顶部保留长度", "后区不要贴死", "整体自然蓬松"],
  },
  {
    id: "crew-cut-clean",
    name: "清爽寸头（Crew Cut）",
    tags: ["极省心", "夏天", "低维护"],
    suited: ["oval", "square"],
    reasons: {
      base: ["打理成本最低", "轮廓干净，显利落", "适合运动/炎热季节"],
      square: ["方脸剪寸头更有力量感"],
    },
    keywords: ["两侧推短但别剃光", "顶部略长一点", "后颈线清楚", "整体干净"],
  },
];

function buildDemoResult(file, rng) {
  const faceShape = pickWeighted(rng, FACE_SHAPES.map((s) => ({ value: s, weight: s.weight })));
  const suited = STYLES.filter((s) => s.suited.includes(faceShape.id));
  const pool = suited.length >= 4 ? suited : suited.concat(STYLES);

  const picked = [];
  const used = new Set();
  while (picked.length < 4 && used.size < pool.length) {
    const idx = Math.floor(rng() * pool.length);
    const style = pool[idx];
    if (used.has(style.id)) continue;
    used.add(style.id);
    picked.push(style);
  }

  const recs = picked.slice(0, 4).map((style) => {
    const bonus = style.suited.includes(faceShape.id) ? 10 : 0;
    const score = Math.round(78 + rng() * 16 + bonus);
    const reasons = [
      ...(style.reasons.base || []),
      ...(style.reasons[faceShape.id] || []),
    ].slice(0, 3);
    return {
      style,
      score: Math.min(98, score),
      reasons,
    };
  });

  const fileHint = file
    ? `${file.name || "photo"} · ${(file.size / 1024).toFixed(0)}KB`
    : "photo";

  return {
    faceShape,
    recs,
    fileHint,
  };
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function initIndexPage() {
  const enterBtn = $("#enterBtn");
  const banner = $("#banner");
  if (!enterBtn) return;

  if (isPlaceholder(ENTER_SHORTLINK_URL)) {
    enterBtn.setAttribute("href", "analyze.html");
    const shouldShowBanner = new URLSearchParams(window.location.search).get("debug") === "1";
    if (banner && shouldShowBanner) banner.classList.add("show");
  } else {
    enterBtn.setAttribute("href", ENTER_SHORTLINK_URL);
  }

  // 仅做展示：投放短链不写进页面也可以
  if (!isPlaceholder(CAMPAIGN_SHORTLINK_URL)) {
    const campaignEl = $("#campaignShortlink");
    if (campaignEl) {
      campaignEl.textContent = CAMPAIGN_SHORTLINK_URL;
      campaignEl.setAttribute("href", CAMPAIGN_SHORTLINK_URL);
    }
  }
}

function initAnalyzePage() {
  const input = $("#photoInput");
  const previewImg = $("#previewImg");
  const previewEmpty = $("#previewEmpty");
  const analyzeBtn = $("#analyzeBtn");
  const statusBadge = $("#statusBadge");
  const progressBar = $("#progressBarInner");
  const result = $("#result");
  const recGrid = $("#recGrid");
  const faceName = $("#faceName");
  const faceSummary = $("#faceSummary");
  const faceTips = $("#faceTips");
  const fileHint = $("#fileHint");
  const copyBtn = $("#copyBtn");
  const copyText = $("#copyText");

  if (!input || !analyzeBtn) return;

  let selectedFile = null;
  let lastResult = null;

  function setBadge(kind, text) {
    if (!statusBadge) return;
    statusBadge.classList.remove("ok", "warn");
    if (kind) statusBadge.classList.add(kind);
    statusBadge.textContent = text;
  }

  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function resetUi() {
    setBadge("warn", "等待上传正脸照（照片仅本地预览）");
    setProgress(0);
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "开始分析";
    if (result) result.classList.remove("show");
    if (recGrid) recGrid.innerHTML = "";
    if (faceTips) faceTips.innerHTML = "";
    if (copyText) copyText.value = "";
    lastResult = null;
  }

  function showPreview(file) {
    if (!previewImg) return;
    const reader = new FileReader();
    reader.onload = () => {
      previewImg.src = String(reader.result || "");
      previewImg.alt = "正脸照片预览";
      if (previewEmpty) previewEmpty.style.display = "none";
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  function renderResult(demo) {
    if (!demo) return;
    if (fileHint) fileHint.textContent = demo.fileHint;
    if (faceName) faceName.textContent = demo.faceShape.name;
    if (faceSummary) faceSummary.textContent = demo.faceShape.summary;
    if (faceTips) {
      faceTips.innerHTML = demo.faceShape.tips.map((t) => `<li>${escapeText(t)}</li>`).join("");
    }

    if (recGrid) {
      recGrid.innerHTML = demo.recs
        .map((item) => {
          const tags = item.style.tags.map((t) => `<span class="pill">${escapeText(t)}</span>`).join(" ");
          const reasons = item.reasons.map((r) => `<li>${escapeText(r)}</li>`).join("");
          const keywords = item.style.keywords.join(" / ");
          return `
            <div class="rec">
              <div class="title">
                <strong>${escapeText(item.style.name)}</strong>
                <span class="score">匹配度 ${item.score}%</span>
              </div>
              <div class="copy-row">${tags}</div>
              <ul>${reasons}</ul>
              <div class="copy-row">
                <span class="badge ok">沟通关键词</span>
                <span class="hint">${escapeText(keywords)}</span>
              </div>
            </div>
          `;
        })
        .join("");
    }

    if (copyText) {
      const lines = [];
      lines.push(`我的脸型（演示版）：${demo.faceShape.name}`);
      lines.push("");
      lines.push("想剪的方向（请理发师按轮廓做干净）：");
      for (const item of demo.recs) {
        lines.push(`- ${item.style.name}`);
        lines.push(`  关键词：${item.style.keywords.join(" / ")}`);
      }
      copyText.value = lines.join("\n");
    }

    if (result) result.classList.add("show");
  }

  resetUi();

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) {
      selectedFile = null;
      resetUi();
      return;
    }

    selectedFile = file;
    showPreview(file);
    analyzeBtn.disabled = false;
    setBadge(null, "已选择照片：点击开始分析（演示版）");
  });

  analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "分析中…";
    setBadge(null, "分析中（约 2 秒）");
    setProgress(5);
    if (result) result.classList.remove("show");

    const seed = hashString(
      `${selectedFile.name}|${selectedFile.size}|${selectedFile.lastModified}|${selectedFile.type}`,
    );
    const rng = makeRng(seed);

    const started = Date.now();
    const totalMs = 1700 + Math.floor(rng() * 500);
    const tickMs = 80;
    const timer = setInterval(() => {
      const t = Date.now() - started;
      const pct = Math.min(96, Math.round((t / totalMs) * 92) + 4);
      setProgress(pct);
    }, tickMs);

    await new Promise((r) => setTimeout(r, totalMs));
    clearInterval(timer);
    setProgress(100);

    lastResult = buildDemoResult(selectedFile, rng);
    renderResult(lastResult);
    setBadge("ok", "分析完成");
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "再分析一次";
  });

  if (copyBtn && copyText) {
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(copyText.value || "");
      const old = copyBtn.textContent;
      copyBtn.textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => (copyBtn.textContent = old), 1200);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if (page === "index") initIndexPage();
  if (page === "analyze") initAnalyzePage();
});
