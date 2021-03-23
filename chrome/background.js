/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 各種情報のリクエストを処理 --- */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	/* [ニコニコ・ブックマーク] ブックマーク内の作品一覧を取得 */
	if (message.request === 'get-bookmarks') {
		const temp_data = [];
		sendResponse(temp_data);
		return true;
	}
	/* どれにも当てはまらなかった場合の処理 */
	sendResponse({});
	return true;
});
