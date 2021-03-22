/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 各種情報のリクエストを処理 --- */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	/* [ニコニコ・ブックマーク] ブックマーク内の作品一覧を取得 */
	if (message.request === 'get-bookmarks') {
		const temp_data = [
			{
				name  : 'サンプルフォルダ1',
				works : [
					{name:'コンテンツツリー登録支援ツール', id:'nc235560'}
					{name:'コモンズ素材名直送ツール'      , id:'nc235559'}
					{name:'コモンズ20プレイヤー'          , id:'nc235556'}
					{name:'ニコ生ツリー転送ツール'        , id:'nc235682'}
				]
			}
		];
		sendResponse(temp_data);
		return true;
	}
	/* どれにも当てはまらなかった場合の処理 */
	sendResponse({});
	return true;
});
