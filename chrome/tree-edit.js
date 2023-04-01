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
const MAX_WORKS          = 300;
let nico_expansion_ready = false;


/* --- ページに要素を追加する --- */


/* --- [nicoExpansion] インストール確認 --- */
browser.runtime.sendMessage({request:'get-exlists'}, response => nico_expansion_ready = Boolean(response));


/* --- IDリストから重複を除去する --- */
const uniqueIdList = id_list => {
	/* IDを1つずつバラバラの配列にする */
	let p_list = [... id_list.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)];
	p_list     = p_list.map(res => res[0]);
	/* IDの形式であり、かつ重複のないリストを作成する */
	let res_list = [];
	for (i in p_list) {
		if (res_list.indexOf(p_list[i]) < 0) {
			res_list.push(p_list[i]);
		}
	}
	/* 既に入力欄にあるか確認する */
	const form     = document.querySelector('input[name="keywords"]');
	const form_ids = [... form.value.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(res => res[0]);
	res_list       = res_list.filter(id => !form_ids.includes(id));
	/* 出来上がったリストを返す */
	return res_list;
};


/* --- IDリストを公式のID入力欄に追加 --- */
const addIdsToForm = ids => {
	/* フォームに入れる */
	const form = document.querySelector('input[name="keywords"]');
	if (form.value.length > 0 && !form.value.endsWith(' ')) form.value += ' ';
	form.value += ids;
	form.setAttribute('saved-value', form.value);
	form.focus({preventScroll:true});
	setTimeout(() => {
		form.value = form.getAttribute('saved-value');
		form.dispatchEvent(new Event('input' , {bubbles:true}));
		form.dispatchEvent(new Event('change', {bubbles:true}));
		form.blur();
	}, 0);
};
