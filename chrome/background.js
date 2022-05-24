/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 各種情報のリクエストを処理 --- */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	/* [ニコニコ・ブックマーク] ブックマーク内の作品一覧を取得 */
	if (message.request === 'get-bookmarks') {
		browser.bookmarks.search('.nicovideo.jp/', bookmark_tree_nodes => {
			let works      = bookmark_tree_nodes.filter(n => checkSupportedURL(n.url));
			let parent_ids = Array.from(new Set(works.map(n => n.parentId)));
			let parents    = parent_ids.map(id => {
				return {
					id   : id,
					name : '',
					list : []
				};
			});
			for (let work of works) {
				for (let folder of parents) {
					if (folder.id === work.parentId) {
						folder.list.push({
							label : work.title,
							id   : extractWorkID(work.url)
						});
						break;
					}
				}
			}
			browser.bookmarks.get(parent_ids, parent_tree_nodes => {
				for (let obj of parents) {
					for (let node of parent_tree_nodes) {
						if (node.id === obj.id) {
							obj.name = node.title;
							delete obj.id;
							break;
						}
					}
				}
				sendResponse(parents);
			});
		});
		return true;
	}
	/* [予約投稿] ツリー登録予約 */
	if (message.request === 'reserve-parents') {
		const datetime = new Date(message.datetime);
		browser.alarms.create('ista-reserve-'+message.id, {when:datetime.getTime()});
		localStorage.setItem('ista-reserve-'+message.id, String(datetime.getTime()));
		let video_list = (localStorage.getItem('ista-reserve-list') || '').split(',').filter(id => id.length > 0);
		video_list.push(message.id);
		localStorage.setItem('ista-reserve-list', video_list.join(','));
		sendResponse({});
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
	return false;
};


/* --- [ニコニコ・ブックマーク] 対応したURLからIDを抽出する --- */
const extractWorkID = url => {
	if (!checkSupportedURL(url)) return null;
	const target_url = url.replace(/https?:\/\//g, '').replace(/\?.*$/g, '');
	const split_url  = target_url.split('/');
	return split_url[split_url.length-1];
};


/* --- [予約投稿] 時刻になったらタブを開く --- */
browser.alarms.onAlarm.addListener(alarm => {
	const video_id = alarm.name.split('-')[2];
	let video_list = (localStorage.getItem('ista-reserve-list') || '').split(',').filter(id => id.length > 0);
	localStorage.setItem('ista-reserve-list', video_list.filter(id => id !== video_id).join(','));
	localStorage.removeItem('ista-reserve-'+video_id);
	browser.tabs.create({
		url    : 'https://commons.nicovideo.jp/tree/edit/' + video_id + '?ista-reserved-tree=true',
		active : false
	});
});


/* --- [予約投稿] イベント再登録 --- */
let video_list = (localStorage.getItem('ista-reserve-list') || '').split(',').filter(id => id.length > 0);
video_list.forEach((id, i, list) => {
	const current_dt = Date.now();
	const target_dt  = Number(localStorage.getItem('ista-reserve-'+id));
	if (target_dt < current_dt) {
		list[i] = null;
		localStorage.removeItem('ista-reserve-'+id);
		browser.tabs.create({
			url    : 'https://commons.nicovideo.jp/tree/edit/' + id + '?ista-reserved-tree=true',
			active : false
		});
	} else {
		browser.alarms.create('ista-reserve-'+id, {when:target_dt.getTime()});
	}
});
video_list = video_list.filter(id => id !== null);
localStorage.setItem('ista-reserve-list', video_list.join(','));
