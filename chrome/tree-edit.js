/*
 * Copyright (C) 2020-2023 istallia
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

/*
 * ページに作用するJavaScript
 * ボタンなどの追加、および動作の記述を行う
 */


/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 状態を保存する --- */
const MAX_WORKS        = 300;
const queue            = [];
let nicoExpansionReady = false;


/* --- ページに要素を追加する --- */


/* --- [nicoExpansion] インストール確認 --- */
browser.runtime.sendMessage({request:'get-exlists'}, response => nico_expansion_ready = Boolean(response));


/* --- IDリストを最高効率に変換する --- */
const optimizeList = (id_list) => {
	/* IDを1つずつバラバラの配列にする */
	let p_list = [... id_list.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)];
	p_list = p_list.map(res => res[0]);
	/* IDの形式であり、かつ重複のないリストを作成する */
	let ok_list = [];
	for (i in p_list) {
		if( ok_list.indexOf(p_list[i]) < 0 ) {
			ok_list.push(p_list[i]);
		}
	}
	/* 既にリストにあるか確認する */
	const garage_list = [... getCommonsIdForm().value.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(res => res[0]);
	ok_list.filter(id => !garage_list.includes(id));
	/* 1行で返す */
	return ok_list.join(' ');
};


/* --- [ツリー・チェイン] ボタンが押されたらチェイン開始 --- */
// button_open.addEventListener('click', () => {
// 	document.getElementById('ista-get-parents-of-parents').addEventListener('click', event => {
// 		/* イベント無効 */
// 		event.preventDefault();
// 		/* 選択範囲のID取得 */
// 		const selection = window.getSelection();
// 		let id_text     = '';
// 		if (selection.toString().length > 0) {
// 			id_text = selection.toString();
// 		} else {
// 			const textarea = document.getElementById('ista-textarea-id-list');
// 			const s_start  = textarea.selectionStart;
// 			const s_end    = textarea.selectionEnd;
// 			id_text        = textarea.value.substring(s_start, s_end);
// 		}
// 		let id_list = optimizeList(id_text, false).join(' ').split(' ');
// 		if (id_list.length < 1 || id_list[0].length < 3) return;
// 		/* すべてのIDに対して親作品取得を実行 */
// 		id_list.forEach(getParentsOfParents);
// 	});
// });


/* --- [ツリー・チェイン] 親作品の親作品を取得 --- */
// const getParentsOfParents = id => {
// 	/* パラメータを準備 */
// 	const params = new URLSearchParams({
// 		_offset   : 0,
// 		_limit    : 300,
// 		with_meta : 0,
// 		_sort     : '-id'
// 	});
// 	/* 送信 */
// 	fetch('https://public-api.commons.nicovideo.jp/v1/tree/'+id+'/relatives/parents?'+params.toString(), {
// 		mode        : 'cors',
// 		credentials : 'include',
// 		cache       : 'no-cache'
// 	})
// 	.catch(err => {
// 		window.alert('サーバーに接続できませんでした。インターネット接続を確認してください。');
// 		console.log(err);
// 		return null;
// 	})
// 	.then(response => response.json())
// 	.then(json => {
// 		/* IDリストの文字列を取得 */
// 		let id_list = json.data.parents.contents.map(work => work.globalId);
// 		let id_text = '';
// 		id_list.forEach((id, i) => {
// 			if (i % 10 < 9) {
// 				id_text += id + ' '
// 			} else {
// 				id_text += id + '\n'
// 			}
// 		});
// 		/* IDリストを入力欄の末尾に追加 */
// 		const textarea   = document.getElementById('ista-textarea-id-list');
// 		let current_text = textarea.value;
// 		if (current_text.slice(-1) !== '\n') current_text += '\n';
// 		textarea.value = current_text + id_text;
// 	});
// };
