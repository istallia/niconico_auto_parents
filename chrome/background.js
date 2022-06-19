/*
 * Copyright (C) 2020-2022 istallia
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- [nicoExpansion] 拡張機能のIDをセット --- */
let nico_expansion_id = 'llmdcigljaahgnofnphhpfdlmbjcjail';
if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
	nico_expansion_id = '{f8b8bf33-a4ef-4fd0-9ab1-3a6a6cbcd2eb}';
}


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
	/* --- [サイドバー] 展開マイリストの一覧を取得 --- */
	if (message.request === 'get-expanded-list') {
		const fetch_options_mylist = {
		  "headers": {
		    "x-frontend-id"       : "6",
		    "x-frontend-version"  : "0",
		    "x-niconico-language" : "ja-jp"
		  },
		  "referrer"       : "https://www.nicovideo.jp/",
		  "referrerPolicy" : "strict-origin-when-cross-origin",
		  "body"           : null,
		  "method"         : "GET",
		  "mode"           : "cors",
		  "credentials"    : "include"
		};
		if (message.id.indexOf('mylist') === 0) {
			fetch(`https://nvapi.nicovideo.jp/v2/mylists/${message.id.replace('mylist/','')}?pageSize=500&page=1`, fetch_options_mylist)
			.then(res => res.ok ? res.json() : null)
			.then(data => {
				if (data) {
					const res = {name:data.data.mylist.name, list:[]};
					data.data.mylist.items.forEach(item => {
						res.list.push({
							id    : item.video.id,
							label : item.video.title
						});
					});
					sendResponse(res);
				} else {
					fetch(`https://nvapi.nicovideo.jp/v1/users/me/mylists/${message.id.replace('mylist/','')}?pageSize=500&page=1`, fetch_options_mylist)
					.then(res => res.ok ? res.json() : null)
					.then(data => {
						if (data) {
							const res = {name:data.data.mylist.name, list:[]};
							data.data.mylist.items.forEach(item => {
								res.list.push({
									id    : item.video.id,
									label : item.video.title
								});
							});
							sendResponse(res);
						} else {
							sendResponse(null);
						}
					});
				}
			});
			return true;
		} else {
			sendResponse(null);
			return false;
		}
	}
	/* [nicoExpansion] 拡張マイリストの取得 */
	if (message.request === 'get-exlists') {
		browser.runtime.sendMessage(nico_expansion_id, {type:'get-exlists'}, response => {
			if (response) {
				response.forEach(folder => {
					folder.list = folder.list.filter(item => checkSupportedURL(item.id));
				});
			}
			sendResponse(response);
		});
		return true;
	}
	/* IDリストからツリー登録ページのHTMLを取得 */
	if (message.request.startsWith('get-tree-')) {
		const id_list      = [[]];
		message.ids.forEach((id, index) => {
			if (id_list[id_list.length-1].length < 10) {
				id_list[id_list.length-1].push(id);
			} else {
				id_list.push([id]);
			}
		});
		const promise_list = id_list.map(id10 => {
			return fetch('https://commons.nicovideo.jp/cpp/ajax/item/search', {
			  'headers': {
			    'content-type'     : 'application/x-www-form-urlencoded',
			    'x-requested-with' : 'XMLHttpRequest'
			  },
		 	  'referrer'       : 'https://commons.nicovideo.jp/tree/',
			  'referrerPolicy' : 'strict-origin-when-cross-origin',
			  'body'           : 'id=' + id10.join('+'),
			  'method'         : 'POST',
			  'mode'           : 'cors',
			  'credentials'    : 'include'
			});
		});
		Promise.all(promise_list)
		.then(responses => {
			const textArray = responses.map(res => res.text());
			return Promise.all(textArray);
		})
		.then(texts => {
			if (message.request === 'get-tree-html') {
				sendResponse({html:texts.join('\n')});
			} else {
				const parser   = new DOMParser();
				const doms     = texts.map(text => [... parser.parseFromString(text, 'text/html').querySelectorAll('li[id]')]).flat();
				const contents = doms.map(dom => {
					let thum_url = dom.querySelector('div.thum-image > img').getAttribute('src');
					if (thum_url.startsWith('/images/')) thum_url = 'https://commons.nicovideo.jp' + thum_url;
					return {
						id    : dom.id,
						title : dom.querySelector('div.dsc').innerText,
						thum  : thum_url,
						url   : generateURL(dom.id),
						type  : dom.querySelector('span[class^="status_"]').innerText
					};
				});
				sendResponse(contents);
			}
		})
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
		return false;
	}
	/* どれにも当てはまらなかった場合の処理 */
	sendResponse({});
	return false;
});


/* --- [サイドバー] 対応URLか確認する --- */
const checkSupportedURL = target_url => {
	if (/(?:sm|im|nc|td|lv|gm)\d{1,12}/.test(target_url)) return true;
	if (/mylist\/\d{1,12}\b/.test(target_url)) return true;
	return false;
};


/* --- [サイドバー] 対応したURLからIDを抽出する --- */
const extractWorkID = url => {
	const match_id = url.match(/(?:sm|im|nc|td|lv|gm)\d{1,12}/);
	if (match_id) return match_id[0];
	const match_mylist = url.match(/mylist\/\d{1,12}\b/);
	if (match_mylist) return match_mylist[0];
};


/* --- 作品IDからページへのURLを生成 --- */
const generateURL = id => {
	const type = id.slice(0, 2);
	switch (type) {
		case 'sm':
			return `https://www.nicovideo.jp/watch/${id}`;
		case 'im':
			return `https://seiga.nicovideo.jp/seiga/${id}`;
		case 'lv':
			return `https://live.nicovideo.jp/watch/${id}`;
		case 'nc':
			return `https://commons.nicovideo.jp/material/${id}`;
		case 'td':
			return `https://3d.nicovideo.jp/works/${id}`;
		case 'co':
			return `https://com.nicovideo.jp/community/${id}`;
		case 'gm':
			return `https://game.nicovideo.jp/atsumaru/games/${id}`;
		case 'nq':
			return `https://q.nicovideo.jp/watch/${id}`;
	}
	return null;
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
