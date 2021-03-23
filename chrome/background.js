/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 各種情報のリクエストを処理 --- */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	/* [ニコニコ・ブックマーク] ブックマーク内の作品一覧を取得 */
	if (message.request === 'get-bookmarks') {
		browser.bookmarks.search('.nicovideo.jp/', bookmark_tree_nodes => {
			let works   = bookmark_tree_nodes.filter(n => checkSupportedURL(n.url));
			let parents = Array.from(new Set(works.map(n => n.parentId)));
			parents     = parents.map(id => {
				return {
					id    : id,
					name  : '',
					works : []
				};
			});
			sendResponse([]);
		});
		return true;
	}
	/* どれにも当てはまらなかった場合の処理 */
	sendResponse({});
	return true;
});


/* --- [ニコニコ・ブックマーク] 対応URLか確認する --- */
const checkSupportedURL = target_url => {
	/* 対応URLリスト */
	const supported_urls = [
		'www.nicovideo.jp/watch/sm',
		'www.nicovideo.jp/watch/so',
		'seiga.nicovideo.jp/seiga/im',
		'sp.nicovideo.jp/watch/sm',
		'sp.nicovideo.jp/watch/so',
		'sp.seiga.nicovideo.jp/seiga/#!/im',
		'commons.nicovideo.jp/material/nc',
		'3d.nicovideo.jp/works/td',
		'game.nicovideo.jp/atsumaru/games/gm',
		'com.nicovideo.jp/community/co'
	];
	/* リストのURLを判定 */
	const checking_url = target_url.replace(/https?:\/\//g, '');
	for (let url of supported_urls) {
		if (checking_url.indexOf(url) === 0) return true;
	}
	/* ブロマガのURLを判定 */
	const regexp = /^ch\.nicovideo\.jp\/[a-zA-Z0-9_]+\/blomaga\/ar\d{2,20}$/;
	return regexp.test(checking_url);
};
