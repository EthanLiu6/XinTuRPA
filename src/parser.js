export function parseAuthors(jsonResponses, keyword = '') {
  const authors = [];
  const seenIds = new Set();
  
  for (const response of jsonResponses) {
    if (!response || !Array.isArray(response.authors)) continue;
    for (const author of response.authors) {
      const parsed = parseAuthor(author, keyword);
      if (parsed && parsed.id) {
        if (!seenIds.has(parsed.id)) {
          seenIds.add(parsed.id);
          authors.push(parsed);
        }
      } else if (parsed) {
        authors.push(parsed);
      }
    }
  }
  return authors;
}

export function parseAuthor(author, keyword = '') {
  if (!author) return null;
  const attrs = author.attribute_datas || {};

  return {
    // 来源关键词
    keyword: keyword,

    // 基本信息
    nick_name: attrs.nick_name || "",
    id: attrs.id || author.star_id || attrs.core_user_id || "",
    star_id: author.star_id || attrs.id || "",
    core_user_id: attrs.core_user_id || "",
    avatar_uri: attrs.avatar_uri || "",
    author_type: getAuthorType(attrs.author_type),
    city: attrs.city || "",
    province: attrs.province || "",
    region: [attrs.province, attrs.city].filter(Boolean).join(" ") || "",
    gender: getGender(attrs.gender),

    // 粉丝数据
    follower: parseInt(attrs.follower || "0", 10),
    follower_str: fmtNum(attrs.follower),
    fans_increment_15d: attrs.fans_increment_within_15d || "",
    fans_increment_30d: attrs.fans_increment_within_30d || "",
    fans_increment_rate_15d: fmtPercent(attrs.fans_increment_rate_within_15d),

    // 内容数据
    interaction_rate: parseFloat(attrs.interact_rate_within_30d || "0"),
    interaction_rate_str: fmtPercent(attrs.interact_rate_within_30d),
    vv_median_30d: parseInt(attrs.vv_median_30d || "0", 10),
    vv_median_str: fmtNum(attrs.vv_median_30d),
    play_over_rate: fmtPercent(attrs.play_over_rate_within_30d),
    content_themes: parseJsonArray(attrs.content_theme_labels_180d),
    star_item_count_30d: attrs.star_item_count_within_30d || "",

    // 电商数据
    e_commerce_enable: attrs.e_commerce_enable === "1" ? "是" : "否",
    ecom_level: attrs.author_ecom_level || "",
    ecom_score: attrs.ecom_score || "",
    ecom_gmv_30d: attrs.ecom_gmv_30d_range || "",
    ecom_gpm_30d: attrs.ecom_gpm_30d_range || "",
    ecom_avg_order: attrs.ecom_avg_order_value_30d_range || "",
    ecom_video_ctr: attrs.ecom_video_ctr_30d_range || "",
    ecom_video_num: attrs.ecom_video_product_num_30d || "",
    ecom_watch_pv: attrs.ecom_watch_pv_30d || "",
    ecom_video_mid_click: attrs.ecom_video_mid_click_pv_30d_range || "",
    star_ecom_main_price: attrs.star_ecom_main_price_30days || "",
    star_ecom_video_num: attrs.star_ecom_video_num_30d || "",
    star_ecom_video_product_num: attrs.star_ecom_video_product_num_30d || "",
    avg_sale_amount: attrs.avg_sale_amount_range || "",

    // 投放预期数据
    expected_play_num: attrs.expected_play_num || "",
    expected_natural_play_num: attrs.expected_natural_play_num || "",
    pic_expected_play_num: attrs.pic_expected_play_num || "",
    burst_text_rate: attrs.burst_text_rate || "",
    expected_cpa3_level: attrs.expected_cpa3_level || "",

    // CPM报价
    assign_cpm_price: attrs.assign_cpm_suggest_price ? `¥${attrs.assign_cpm_suggest_price}/CPM` : "",
    assign_task_prices: parseJsonArray(attrs.assign_task_price_list),

    // 星图报价
    price_1_20: fmtPrice(attrs.price_1_20),
    price_20_60: fmtPrice(attrs.price_20_60),
    price_60: fmtPrice(attrs.price_60),
    prospective_1_20_cpm: attrs.prospective_1_20_cpm || "",
    prospective_20_60_cpm: attrs.prospective_20_60_cpm || "",
    prospective_60_cpm: attrs.prospective_60_cpm || "",
    prospective_1_20_cpe: attrs.prospective_1_20_cpe || "",
    prospective_20_60_cpe: attrs.prospective_20_60_cpe || "",
    prospective_60_cpe: attrs.prospective_60_cpe || "",

    // 自然流量数据
    sn_play_over_rate: fmtPercent(attrs.sn_play_over_rate_within_30d),
    sn_interact_rate: fmtPercent(attrs.sn_interact_rate_within_30d),
    sn_prospective_1_20_cpm: attrs.sn_prospective_1_20_cpm || "",
    sn_prospective_20_60_cpm: attrs.sn_prospective_20_60_cpm || "",
    sn_prospective_60_cpm: attrs.sn_prospective_60_cpm || "",
    sn_prospective_1_20_cpe: attrs.sn_prospective_1_20_cpe || "",
    sn_prospective_20_60_cpe: attrs.sn_prospective_20_60_cpe || "",
    sn_prospective_60_cpe: attrs.sn_prospective_60_60_cpe || "",

    // 星图指数
    star_index: attrs.star_index ? parseFloat(attrs.star_index).toFixed(2) : "",
    link_convert_index: attrs.link_convert_index ? parseFloat(attrs.link_convert_index).toFixed(2) : "",
    link_convert_index_industry: attrs.link_convert_index_by_industry ? parseFloat(attrs.link_convert_index_by_industry).toFixed(2) : "",
    link_shopping_index: attrs.link_shopping_index ? parseFloat(attrs.link_shopping_index).toFixed(2) : "",
    link_spread_index: attrs.link_spread_index ? parseFloat(attrs.link_spread_index).toFixed(2) : "",
    link_spread_index_industry: attrs.link_spread_index_by_industry ? parseFloat(attrs.link_spread_index_by_industry).toFixed(2) : "",
    link_star_index: attrs.link_star_index || "",
    link_star_index_industry: attrs.link_star_index_by_industry || "",
    link_recommend_index_industry: attrs.link_recommend_index_by_industry || "",
    search_view_index: attrs.search_after_view_index_by_industry || "",

    // 行业转化数据
    link_i_cnt_industry: attrs.link_i_cnt_by_industry || "",
    link_k_cnt_industry: attrs.link_k_cnt_by_industry || "",
    link_l_cnt_industry: attrs.link_l_cnt_by_industry || "",
    link_n_cnt_industry: attrs.link_n_cnt_by_industry || "",
    link_link_cnt_industry: attrs.link_link_cnt_by_industry || "",
    link_user_type_industry: attrs.link_user_type_by_industry || "",
    brand_boost_vv: attrs.brand_boost_vv || "",
    interaction_median_30d: attrs.interaction_median_30d || "",
    avg_search_view_rate: attrs.avg_search_after_view_rate_30d || "",

    // 标签
    tags: parseJsonObject(attrs.tags_relation),
    association_words: parseAuthorWords(attrs.author_thin_mid_word_association_index),

    // 特殊标识
    is_cocreate: attrs.is_cocreate_author === "true" ? "是" : "否",
    is_cpm_author: attrs.is_cpm_project_author === "1" ? "是" : "否",
    is_black_horse: attrs.is_black_horse_author === "true" ? "是" : "否",
    is_excellent: attrs.is_excellenct_author === "1" ? "是" : "否",
    is_short_drama: attrs.is_short_drama === "1" ? "是" : "否",
    is_ad_high_quality: attrs.is_ad_star_cur_high_quality_author === "1" ? "是" : "否",
    is_qianchuan_potential: attrs.star_qianchuan_high_potential === "1" ? "是" : "否",
    is_whispers_author: attrs.star_whispers_author === "1" ? "是" : "否",
    is_local_lower: attrs.local_lower_threshold_author === "true" ? "是" : "否",

    // task_infos报价详情
    task_prices: parseTaskPrices(author.task_infos),

    // 原始数据
    raw: author
  };
}

function getAuthorType(type) {
  const map = { "1": "黄V", "2": "蓝V", "3": "个人", "0": "无" };
  return map[String(type)] || type || "无";
}

function getGender(g) {
  return g === "1" ? "男" : g === "2" ? "女" : "未知";
}

function fmtNum(num) {
  if (!num && num !== 0) return "0";
  const n = parseInt(num, 10);
  if (isNaN(n)) return "0";
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "亿";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toString();
}

function fmtPercent(num) {
  if (!num) return "0%";
  const n = parseFloat(num);
  if (isNaN(n)) return "0%";
  return (n * 100).toFixed(2) + "%";
}

function fmtPrice(price) {
  if (!price) return "";
  const p = parseInt(price, 10);
  if (isNaN(p) || p === 0) return "";
  if (p >= 10000) return (p / 10000) + "万";
  return p.toString();
}

function parseJsonArray(str) {
  if (!str) return "";
  try {
    const arr = JSON.parse(str);
    return Array.isArray(arr) ? arr.join("、") : str;
  } catch {
    return str || "";
  }
}

function parseJsonObject(str) {
  if (!str) return "";
  try {
    const obj = JSON.parse(str);
    const values = Object.values(obj).flat();
    return values.join("、");
  } catch {
    return str || "";
  }
}

function parseAuthorWords(str) {
  if (!str) return "";
  try {
    const obj = JSON.parse(str);
    return Object.keys(obj)
      .sort((a, b) => obj[b] - obj[a])
      .slice(0, 5)
      .join("、");
  } catch {
    return "";
  }
}

function parseTaskPrices(taskInfos) {
  if (!taskInfos || !Array.isArray(taskInfos)) return [];
  const prices = [];
  for (const task of taskInfos) {
    if (!task.price_infos) continue;
    for (const p of task.price_infos) {
      prices.push({
        video_type: getVideoTypeName(p.video_type),
        price: p.price ? fmtPrice(p.price) : "",
        status: p.video_type_status === 1 ? "有效" : "无效"
      });
    }
  }
  return prices;
}

function getVideoTypeName(type) {
  const map = {
    1: "1-20秒",
    2: "21-60秒",
    3: "60秒+",
    71: "合集",
    90: "图文",
    91: "小程序",
    92: "CPM",
    150: "长视频"
  };
  return map[type] || `类型${type}`;
}

export function getCsvHeaders() {
  return [
    "来源关键词",
    "昵称", "达人ID", "认证类型", "地区", "性别",
    "粉丝数", "15天涨粉", "30天涨粉", "15天涨粉率",
    "互动率", "平均播放", "完播率", "30天作品数",
    "橱窗", "电商等级", "电商评分", "30天GMV", "GPM", "客单价", "视频CTR", "带货视频数", "观看PV", "视频中点击", "合作参考价",
    "1-20秒报价", "21-60秒报价", "60秒+报价",
    "1-20秒CPM", "21-60秒CPM", "60秒+CPM",
    "1-20秒CPE", "21-60秒CPE", "60秒+CPE",
    "星图指数", "转化指数", "行业转化指数", "种草指数", "传播指数", "行业传播指数",
    "行业推荐指数", "搜索观看指数", "行业曝光数", "行业点击数", "行业点赞数", "行业互动数",
    "内容标签", "关联热词",
    "星图合作", "CPM项目", "黑马达人", "优质达人", "短剧达人", "广告优质", "千川潜力", "耳语达人", "本地低门槛",
    "自然完播率", "自然互动率",
    "自然CPM(1-20s)", "自然CPM(20-60s)", "自然CPM(60s+)",
    "自然CPE(1-20s)", "自然CPE(20-60s)", "自然CPE(60s+)",
    "爆款率", "CPA3等级", "预期播放", "自然预期播放", "图文预期播放",
    "报价详情"
  ];
}

export function authorToCsvRow(author) {
  const taskPrices = author.task_prices || [];
  const priceDetails = taskPrices
    .filter(p => p.status === "有效")
    .map(p => `${p.video_type}:${p.price}`)
    .join("; ");

  return [
    author.keyword,
    author.nick_name,
    author.id,
    author.author_type,
    author.region,
    author.gender,
    author.follower_str,
    author.fans_increment_15d,
    author.fans_increment_30d,
    author.fans_increment_rate_15d,
    author.interaction_rate_str,
    author.vv_median_str,
    author.play_over_rate,
    author.star_item_count_30d,
    author.e_commerce_enable,
    author.ecom_level,
    author.ecom_score,
    author.ecom_gmv_30d,
    author.ecom_gpm_30d,
    author.avg_sale_amount,
    author.ecom_video_ctr,
    author.ecom_video_num,
    author.ecom_watch_pv,
    author.ecom_video_mid_click,
    author.star_ecom_main_price,
    author.price_1_20,
    author.price_20_60,
    author.price_60,
    author.prospective_1_20_cpm,
    author.prospective_20_60_cpm,
    author.prospective_60_cpm,
    author.prospective_1_20_cpe,
    author.prospective_20_60_cpe,
    author.prospective_60_cpe,
    author.star_index,
    author.link_convert_index,
    author.link_convert_index_industry,
    author.link_shopping_index,
    author.link_spread_index,
    author.link_spread_index_industry,
    author.link_recommend_index_industry,
    author.search_view_index,
    author.link_i_cnt_industry,
    author.link_k_cnt_industry,
    author.link_l_cnt_industry,
    author.link_n_cnt_industry,
    author.content_themes,
    author.association_words,
    author.is_cocreate,
    author.is_cpm_author,
    author.is_black_horse,
    author.is_excellent,
    author.is_short_drama,
    author.is_ad_high_quality,
    author.is_qianchuan_potential,
    author.is_whispers_author,
    author.is_local_lower,
    author.sn_play_over_rate,
    author.sn_interact_rate,
    author.sn_prospective_1_20_cpm,
    author.sn_prospective_20_60_cpm,
    author.sn_prospective_60_cpm,
    author.sn_prospective_1_20_cpe,
    author.sn_prospective_20_60_cpe,
    author.sn_prospective_60_cpe,
    author.burst_text_rate,
    author.expected_cpa3_level,
    author.expected_play_num,
    author.expected_natural_play_num,
    author.pic_expected_play_num,
    priceDetails
  ];
}

export function getSummary(authors) {
  return {
    total_count: authors.length,
    with_prices: authors.filter(a => a.price_1_20 || a.price_20_60 || a.price_60).length,
    with_ecommerce: authors.filter(a => a.e_commerce_enable === "是").length,
    with_cocreate: authors.filter(a => a.is_cocreate === "是").length
  };
}
