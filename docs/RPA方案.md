# 星图达人获取RPA方案

## 项目概述
开发一个自动化RPA工具，用于从抖音星图平台获取达人数据，包括昵称、ID、粉丝数、报价等信息，并导出为JSON格式。

## 功能需求
1. 使用本机Windows的Chrome或Edge浏览器，打开网页，需要**手动登录**抖音星图平台：`https://sso.oceanengine.com/xingtu/login?role=1`
2. 进入达人搜索页：`https://www.xingtu.cn/ad/creator/market`
3. 搜索并筛选目标达人，有关键词搜索和id搜索两种方式，目前先选择关键词搜索
3. 批量抓取达人信息：
   - 达人昵称
   - 达人ID/UID
   - 粉丝数量
   - 报价信息（一定要有，分不同时间类型的好像是）
   - 其他相关数据（如分类、标签等）
4. 数据导出为JSON格式
5. 相关接口我在页面查到这些：
```
搜索窗：https://mcs.zijieapi.com/list?aid=1581&sdk_version=5.3.9&device_platform=web
搜索相关的请求:
https://www.xingtu.cn/gw/api/gsearch/search_intent_authors?search_type=3&keyword=%E5%81%A5%E8%BA%AB
https://www.xingtu.cn/gw/api/gsearch/get_search_query_extend?query=%E5%81%A5%E8%BA%AB

https://www.xingtu.cn/gw/api/gsearch/search_for_author_square 
```
6. 达人搜索请求结果类似这样(删除了一些中间数据)：
```JSON
{
    "authors": [
        {
            "attribute_datas": {
                "assign_cpm_suggest_price": "24",
                "assign_task_price_list": "[50000,80000,240000]",
                "author_avatar_frame_icon": "20",
                "author_ecom_level": "L6",
                "author_level_game": "Lv1",
                "author_level_other": "Lv1",
                "author_status": "1",
                "author_thin_mid_word_association_index": "{\"健身\":54.448686322760096,\"年轻人\":5.471499999999972,\"异地恋\":0.552,\"早餐\":6.058,\"绵密\":1.0350000000000001,\"蛋白质\":5.636123059238056,\"防水\":0.8840000000000003}",
                "author_type": "2",
                "avatar_uri": "https://p26.douyinpic.com/aweme/1080x1080/aweme-avatar/tos-cn-avt-0015_07bca090453529120b9c9e2f814d7ab5.jpeg?from=3782654143",
                "avg_sale_amount_range": "1000-5000",
                "avg_search_after_view_rate_30d": "0.001",
                "brand_boost_vv": "0",
                "burst_text_rate": "0.75",
                "city": "上海",
                "content_theme_labels_180d": "[\"搞笑挑战\",\"美食挑战\",\"豪车展示\",\"搞笑剧情\",\"户外钓鱼\",\"美食吃播\",\"荤菜教程\",\"海外旅行\",\"相亲探讨\",\"垂钓之旅\"]",
                "core_user_id": "3703570636486996",
                "e_commerce_enable": "1",
                "ecom_avg_order_value_30d_range": "50-200",
                "ecom_gmv_30d_range": "\u003e100w",
                "ecom_gpm_30d_range": "\u003c=80",
                "ecom_gpm_30days_range": "5以下",
                "ecom_score": "74",
                "ecom_video_ctr_30d_range": "4%-6%",
                "ecom_video_mid_click_pv_30d_range": "500以下",
                "ecom_video_product_num_30d": "2",
                "ecom_watch_pv_30d": "1.1",
                "expected_cpa3_level": "4",
                "expected_natural_play_num": "3361698",
                "expected_play_num": "3919982",
                "fans_increment_rate_within_15d": "0.012356257311739623",
                "fans_increment_within_15d": "75550",
                "fans_increment_within_30d": "2293717.11",
                "follower": "6189325",
                "game_type": "",
                "gender": "0",
                "grade": "0",
                "id": "7029342444797820939",
                "interact_rate_within_30d": "0.0143",
                "interaction_median_30d": "76268",
                "is_ad_star_cur_high_quality_author": "0",
                "is_black_horse_author": "false",
                "is_cocreate_author": "true",
                "is_cpm_project_author": "1",
                "is_excellenct_author": "0",
                "is_short_drama": "0",
                "last_10_items": "[{\"comment_cnt\":\"730\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773833477\",\"item_id\":\"7618556745526431010\",\"item_publish_time\":\"1773833477\",\"item_title\":\"百日报名女生正式开启  #百人百日百万  #百日彭于晏  #华哥带你练\",\"like_cnt\":\"3141\",\"share_cnt\":\"1943\",\"vv\":\"347096\"},{\"comment_cnt\":\"4773\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773643217\",\"item_id\":\"7617739576362290472\",\"item_publish_time\":\"1773653400\",\"item_title\":\"迪拜俯卧撑挑战，看看外国人身体水平怎么样？#俯卧撑 #百人百日百万  #百日彭于晏  #华哥带你练\",\"like_cnt\":\"56430\",\"share_cnt\":\"5217\",\"vv\":\"4054996\"},{\"comment_cnt\":\"904\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773467856\",\"item_id\":\"7616986418551737640\",\"item_publish_time\":\"1773567001\",\"item_title\":\"来看看老外如何评价中国的健美选手#迪拜 #健身房 #百人百日百万  #百日彭于晏  #华哥带你练\",\"like_cnt\":\"13042\",\"share_cnt\":\"475\",\"vv\":\"1132255\"},{\"comment_cnt\":\"10864\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773470809\",\"item_id\":\"7616999103695834383\",\"item_publish_time\":\"1773480600\",\"item_title\":\"100公斤哑铃来到了迪拜，看一下中东的力量水平如何 #100公斤哑铃挑战 #百人百日百万 #华哥带你练 #百日彭于晏\",\"like_cnt\":\"179750\",\"share_cnt\":\"13253\",\"vv\":\"11856845\"},{\"comment_cnt\":\"1523\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773299897\",\"item_id\":\"7616265035853221160\",\"item_publish_time\":\"1773394214\",\"item_title\":\"挑战pk中东顶级的健身选手，看看同是四旬老汉谁更猛！#foyes增肌粉  #健身  #FoYes数智工厂\",\"like_cnt\":\"56563\",\"share_cnt\":\"1272\",\"vv\":\"3596066\"},{\"comment_cnt\":\"12783\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773315453\",\"item_id\":\"7616331814365449512\",\"item_publish_time\":\"1773315453\",\"item_title\":\"不能让阴柔之风成为我们的主流，我在上海等你来战 #百人百日百万  #百日彭于晏  #华哥带你练\",\"like_cnt\":\"51266\",\"share_cnt\":\"14292\",\"vv\":\"5943618\"},{\"comment_cnt\":\"4357\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773227235\",\"item_id\":\"7615952902930189568\",\"item_publish_time\":\"1773227235\",\"item_title\":\"看完了几千个报名的选手，内心有很多感想 #百人百日百万 #百日彭于晏 #华哥带你练\",\"like_cnt\":\"14547\",\"share_cnt\":\"2349\",\"vv\":\"1843113\"},{\"comment_cnt\":\"1813\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1772618570\",\"item_id\":\"7613338722121125160\",\"item_publish_time\":\"1773048646\",\"item_title\":\"花3000块钱，和迪拜的健身教练上一节课，看看到底值不值#迪拜  #健身  #私教一对一\",\"like_cnt\":\"23625\",\"share_cnt\":\"1564\",\"vv\":\"2993844\"},{\"comment_cnt\":\"65008\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1772965303\",\"item_id\":\"7614827897844550927\",\"item_publish_time\":\"1772965303\",\"item_title\":\"百日报名正式开启#华哥带你练 #百人百日百万#百日彭于晏\",\"like_cnt\":\"152978\",\"share_cnt\":\"68312\",\"vv\":\"12688022\"},{\"comment_cnt\":\"11348\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1772870140\",\"item_id\":\"7614419230917725440\",\"item_publish_time\":\"1772870140\",\"item_title\":\"迪拜机场现状，保持好心态#迪拜 #百日彭于晏#华哥带你练  #百人百日百万\",\"like_cnt\":\"137578\",\"share_cnt\":\"10198\",\"vv\":\"10560226\"}]",
                "link_convert_index": "91.64",
                "link_convert_index_by_industry": "92.71",
                "link_i_cnt_by_industry": "26484116",
                "link_k_cnt_by_industry": "23009",
                "link_l_cnt_by_industry": "26578420",
                "link_link_cnt_by_industry": "59361448",
                "link_n_cnt_by_industry": "6275903",
                "link_recommend_index_by_industry": "86.99",
                "link_shopping_index": "92.5",
                "link_spread_index": "95.56",
                "link_spread_index_by_industry": "91.73",
                "link_star_index": "88.1",
                "link_star_index_by_industry": "88.25",
                "link_user_type_by_industry": "1",
                "local_lower_threshold_author": "false",
                "nick_name": "健身华哥",
                "pic_expected_play_num": "17462",
                "play_over_rate_within_30d": "0.2486",
                "playlet_author_types": "[3]",
                "price_1_20": "80000",
                "price_20_60": "200000",
                "price_60": "300000",
                "prospective_1_20_cpm": "20.4083",
                "prospective_20_60_cpm": "51.0206",
                "prospective_60_cpm": "76.531",
                "province": "",
                "search_after_view_index_by_industry": "96.96",
                "sn_expected_play_num": "3919982",
                "sn_interact_rate_within_30d": "0.0143",
                "sn_play_over_rate_within_30d": "0.2486",
                "sn_prospective_1_20_cpe": "1.5399",
                "sn_prospective_1_20_cpm": "20.4083",
                "sn_prospective_20_60_cpe": "3.8497",
                "sn_prospective_20_60_cpm": "51.0206",
                "sn_prospective_60_cpe": "5.7746",
                "sn_prospective_60_cpm": "76.531",
                "star_ecom_main_price_30days": "493.5",
                "star_ecom_video_num_30d": "2",
                "star_ecom_video_product_num_30d": "2",
                "star_excellent_author": "0",
                "star_index": "84.7348344931917",
                "star_item_count_within_30d": "2",
                "star_qianchuan_high_potential": "0",
                "star_whispers_author": "0",
                "tags_relation": "{\"三农\":[\"三农\"]}",
                "vv_median_30d": "5151193.5"
            },
            "extra_data": {
                "content_query_from_word": "",
                "content_query_score": 0,
                "debug_info": "",
                "demander_behavior": {
                    "added_author_list": false,
                    "cooperated": false,
                    "viewd_author_page": false
                },
                "recall_from": [
                    "1_0"
                ],
                "recall_return_infos": {},
                "recommend_types": []
            },
            "items": [
                {
                    "item_id": "7585509264798584091",
                    "video_tag": 3,
                    "vv": 28187598
                },
                {
                    "item_id": "7612627265230294324",
                    "video_tag": 3,
                    "vv": 24739779
                },
                {
                    "item_id": "7579906176666717474",
                    "video_tag": 4,
                    "vv": 27587292
                },
                {
                    "item_id": "7605502028357389620",
                    "video_tag": 4,
                    "vv": 22628198
                },
                {
                    "item_id": "7564676046956678440",
                    "video_tag": 5,
                    "vv": 20903445
                },
                {
                    "item_id": "7555783474376985891",
                    "video_tag": 5,
                    "vv": 19804007
                },
                {
                    "item_id": "7618556745526431010",
                    "video_tag": 6,
                    "vv": 287584
                },
                {
                    "item_id": "7617739576362290472",
                    "video_tag": 6,
                    "vv": 3608850
                }
            ],
            "star_id": "7029342444797820939",
            "task_infos": [
                {
                    "online_status": 1,
                    "platform_source": 1,
                    "price_infos": [
                        {
                            "end_time": "2145916800",
                            "platform_source": 1,
                            "price": 70000,
                            "price_extra_info": {},
                            "start_time": "1672502400",
                            "task_category": 1,
                            "video_type": 90,
                            "video_type_status": 1
                        },
                        {
                            "end_time": "2145916800",
                            "platform_source": 1,
                            "price": 28000,
                            "price_extra_info": {},
                            "start_time": "1672502400",
                            "task_category": 1,
                            "video_type": 91,
                            "video_type_status": 1
                        },
                        {
                            "end_time": "2145916800",
                            "platform_source": 1,
                            "price": 80000,
                            "price_extra_info": {},
                            "start_time": "1769411726",
                            "task_category": 1,
                            "video_type": 1,
                            "video_type_status": 1
                        },
                        {
                            "end_time": "2145916800",
                            "platform_source": 1,
                            "price": 18,
                            "price_extra_info": {
                                "ceiling_price": "140000",
                                "floor_price": "14000"
                            },
                            "start_time": "1714990091",
                            "task_category": 1,
                            "video_type": 92,
                            "video_type_status": 1
                        },
                        {
                            "end_time": "2145916800",
                            "platform_source": 1,
                            "price": 300000,
                            "price_extra_info": {},
                            "start_time": "1769411726",
                            "task_category": 1,
                            "video_type": 71,
                            "video_type_status": 1
                        },
                        {
                            "end_time": "2145916800",
                            "platform_source": 1,
                            "price": 200000,
                            "price_extra_info": {},
                            "start_time": "1769411726",
                            "task_category": 1,
                            "video_type": 2,
                            "video_type_status": 1
                        },
                        {
                            "end_time": "2145916800",
                            "platform_source": 1,
                            "price": 400000,
                            "price_extra_info": {},
                            "start_time": "1769411726",
                            "task_category": 1,
                            "video_type": 150,
                            "video_type_status": 1
                        }
                    ],
                    "task_category": 1,
                    "task_status": 1
                }
            ]
        },
        {
            "attribute_datas": {
                "assign_cpm_suggest_price": "27",
                "author_avatar_frame_icon": "0",
                "author_ecom_level": "L1",
                "author_level_game": "Lv1",
                "author_level_other": "Lv1",
                "author_status": "1",
                "author_thin_mid_word_association_index": "{\"健身\":0.0003333333333333333,\"清爽\":0,\"蛋白质\":0}",
                "author_type": "1",
                "avatar_uri": "https://p11.douyinpic.com/aweme/1080x1080/aweme-avatar/tos-cn-avt-0015_b8b3ed7972241bd1927cb80d37a9e2ff.jpeg?from=3782654143",
                "brand_boost_vv": "0",
                "city": "",
                "content_theme_labels_180d": "[\"健身增肌\",\"力量训练\",\"健康饮食\",\"零食测评\",\"饮品制作\",\"减脂美食\",\"体重管理\"]",
                "core_user_id": "100083219487",
                "e_commerce_enable": "1",
                "ecom_score": "78",
                "ecom_video_ctr_30d_range": "2%-4%",
                "ecom_video_mid_click_pv_30d_range": "500以下",
                "ecom_video_product_num_30d": "10",
                "expected_natural_play_num": "385",
                "expected_play_num": "422",
                "fans_increment_rate_within_15d": "-0.0020669904550132696",
                "fans_increment_within_15d": "-1201",
                "fans_increment_within_30d": "-2454",
                "follower": "579817",
                "game_type": "{\"\\u5c04\\u51fb\": 1.0}",
                "gender": "1",
                "grade": "0",
                "id": "6629656325343150084",
                "interact_rate_within_30d": "0.0049",
                "interaction_median_30d": "8.5",
                "is_ad_star_cur_high_quality_author": "0",
                "is_black_horse_author": "false",
                "is_cocreate_author": "false",
                "is_cpm_project_author": "0",
                "is_excellenct_author": "0",
                "is_short_drama": "0",
                "last_10_items": "[{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773728794\",\"item_id\":\"7618107139202075954\",\"item_publish_time\":\"1773803940\",\"item_title\":\"要是早点发现它，也不用受那么多苦了 #Hot增肌粉 #健身 #补剂 #自律\",\"like_cnt\":\"0\",\"share_cnt\":\"0\",\"vv\":\"94\"},{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773727785\",\"item_id\":\"7618102796956585256\",\"item_publish_time\":\"1773800160\",\"item_title\":\"不愧是A类补给，后悔没早点知道它！ #运动  #健身  #康比特肌酸\",\"like_cnt\":\"0\",\"share_cnt\":\"0\",\"vv\":\"117\"},{\"comment_cnt\":\"1\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773372774\",\"item_id\":\"7616578050855013683\",\"item_publish_time\":\"1773372774\",\"item_title\":\"hot蛋白粉，六重蛋白矩阵，不会让你失望 #Hot六重蛋白粉 #蛋白粉 #补剂 #健身 #强烈推荐#Hot六重蛋白 #蛋白粉推荐  #健身 #宽肩窄腰\",\"like_cnt\":\"1\",\"share_cnt\":\"0\",\"vv\":\"364\"},{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773317940\",\"item_id\":\"7616342330458557715\",\"item_publish_time\":\"1773364440\",\"item_title\":\"瘦子救星！康比特mass增肌粉！偏瘦人吃的第一桶蛋白粉！ #康比特  #运动健身  #瘦子增重\",\"like_cnt\":\"0\",\"share_cnt\":\"0\",\"vv\":\"212\"},{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773144444\",\"item_id\":\"7615597315985902884\",\"item_publish_time\":\"1773195360\",\"item_title\":\"想进步更快的兄弟，碳水补充不能落下！ #健身  #运动  #康比特增肌粉  #康比特增肌粉max\",\"like_cnt\":\"0\",\"share_cnt\":\"0\",\"vv\":\"162\"},{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1773021258\",\"item_id\":\"7615068146654825764\",\"item_publish_time\":\"1773021258\",\"item_title\":\"新学期着急进步的真可以试试!肌酸会带你杀出重围! #健身 #肌酸 #健身补剂 #康比特肌酸 #运动\",\"like_cnt\":\"1\",\"share_cnt\":\"0\",\"vv\":\"743\"},{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1772794329\",\"item_id\":\"7614093625596611878\",\"item_publish_time\":\"1772934060\",\"item_title\":\"健身党别再忍难喝的蛋白粉了！这口直接戳中爽点 #乳清蛋白粉推荐 #训练怪兽蛋白粉 #训练怪兽坚持真材实料\",\"like_cnt\":\"0\",\"share_cnt\":\"0\",\"vv\":\"207\"},{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1772796994\",\"item_id\":\"7614105051979631918\",\"item_publish_time\":\"1772796994\",\"item_title\":\"增肌想快人一步，先把恢复做好！ #训练怪兽  #训练怪兽谷氨酰胺  #谷氨酰胺   #健身\",\"like_cnt\":\"2\",\"share_cnt\":\"2\",\"vv\":\"387\"},{\"comment_cnt\":\"0\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1772536291\",\"item_id\":\"7612985148568554771\",\"item_publish_time\":\"1772678340\",\"item_title\":\"清爽、果香、不甜腻！foyes热带水果味， 满足你对增肌粉的所有幻想！ #健身  #强烈推荐  #foyes增肌粉max  #FoYes开学季   #FoYes果力爆肌\",\"like_cnt\":\"1\",\"share_cnt\":\"0\",\"vv\":\"149\"},{\"comment_cnt\":\"10\",\"is_high_quality_item\":\"0\",\"item_create_time\":\"1772528419\",\"item_id\":\"7612951417065688326\",\"item_publish_time\":\"1772590320\",\"item_title\":\"茶味高级不廉价，FoYes 金萱乌龙真的懂口味 #FoYes力量乌龙 #foyes蛋白粉 #健身补剂 #蛋白粉  #FoYes开学季\",\"like_cnt\":\"0\",\"share_cnt\":\"0\",\"vv\":\"737\"}]",
                "link_convert_index": "72.68",
                "link_convert_index_by_industry": "72.6",
                "link_i_cnt_by_industry": "2328",
                "link_k_cnt_by_industry": "79",
                "link_l_cnt_by_industry": "33369",
                "link_link_cnt_by_industry": "36651",
                "link_n_cnt_by_industry": "875",
                "link_recommend_index_by_industry": "42.85",
                "link_shopping_index": "53.88",
                "link_spread_index": "49.99",
                "link_spread_index_by_industry": "42.83",
                "link_star_index": "56.31",
                "link_star_index_by_industry": "52.66",
                "link_user_type_by_industry": "1",
                "local_lower_threshold_author": "false",
                "nick_name": "健身吧网",
                "pic_expected_play_num": "106",
                "play_over_rate_within_30d": "0.0102",
                "province": "",
                "search_after_view_index_by_industry": "49.08",
                "sn_expected_play_num": "422",
                "sn_interact_rate_within_30d": "0.0049",
                "sn_play_over_rate_within_30d": "0.0102",
                "star_excellent_author": "0",
                "star_qianchuan_high_potential": "1",
                "star_whispers_author": "1",
                "tags_relation": "{\"运动健身\":[\"健身\"]}",
                "vv_median_30d": "3878"
            },
            "extra_data": {
                "content_query_from_word": "",
                "content_query_score": 0,
                "debug_info": "",
                "demander_behavior": {
                    "added_author_list": false,
                    "cooperated": false,
                    "viewd_author_page": false
                },
                "recall_from": [
                    "1_0"
                ],
                "recall_return_infos": {},
                "recommend_types": []
            },
            "items": [
                {
                    "item_id": "7564370247017336104",
                    "video_tag": 3,
                    "vv": 802199
                },
                {
                    "item_id": "7566525406417833262",
                    "video_tag": 3,
                    "vv": 182552
                },
                {
                    "item_id": "7595111756758830388",
                    "video_tag": 5,
                    "vv": 15933
                },
                {
                    "item_id": "7571391957851835690",
                    "video_tag": 5,
                    "vv": 13896
                },
                {
                    "item_id": "7618107139202075954",
                    "video_tag": 6,
                    "vv": 86
                },
                {
                    "item_id": "7618102796956585256",
                    "video_tag": 6,
                    "vv": 101
                }
            ],
            "star_id": "6629656325343150084",
            "task_infos": []
        }
    ],
    "base_resp": {
        "status_code": 0,
        "status_message": ""
    },
    "extra_data": {
        "intent_score": 0.8130385279655457,
        "is_cpm_project_search": false,
        "is_intent_consistent": true,
        "search_author_count": 0,
        "search_item_count": 0,
        "search_session_id": "7618788022426894346"
    },
    "pagination": {
        "has_more": true,
        "limit": 20,
        "page": 1,
        "total_count": 5032
    }
}
```

## 技术栈选择
- **编程语言**: 任何可以用的语言，也可以是Node.js
- **浏览器自动化**: 支持启用本机Windows的Chrome或Edge浏览器
- **数据存储**: JSON文件
- **项目管理**: 如果是nodejs的话用npm，python的话用conda的py10环境和pip
## 开发环境要求
- 网络连接（访问抖音星图平台）

## 实施步骤
1. 构建完善方案
2. 项目初始化：创建项目结构，安装依赖
3. 核心功能开发：
   - 浏览器自动化控制
   - 页面元素定位和交互
   - 数据提取和解析
   - 数据存储和导出
4. 测试和优化
5. 部署和使用说明

## 预期输出
- 完整的项目代码
- 可执行的RPA脚本
- 配置文件（如登录信、请求间隔、搜索条件等多个相关参数）
- 使用文档

## 注意事项
1. 需要模拟人类操作行为
2. 需要合理的请求间隔
