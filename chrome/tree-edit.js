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
const queue              = [];
let is_adding_ids        = false;
let nico_expansion_ready = false;


/* --- セットアップフェーズ --- */
const PHASE_EXTRACTOR       = 0;
const PHASE_SIDEBAR_BODY    = 1;
const PHASE_SIDEBAR_BUTTONS = 2;
const PHASE_COMPLETE        = 3;
let setup_phase             = PHASE_EXTRACTOR;


/* --- [nicoExpansion] インストール確認 --- */
browser.runtime.sendMessage({request:'get-exlists'}, response => nico_expansion_ready = Boolean(response));


/* --- ページに要素を追加する (なければ再実行) --- */
const setupToolFunctions = () => {
	/* [ファイルID抽出] ID入力欄の親にドロップイベントを設定する */
	if (setup_phase <= PHASE_EXTRACTOR) {
		const drop_area = document.querySelector('div.addDockFormArea');
		if (!drop_area) setTimeout(setupToolFunctions, 100);
		drop_area.addEventListener('drop', extractIdsFromFiles);
		drop_area.addEventListener('drop', event => {
			event.currentTarget.classList.remove('hover');
		});
		drop_area.addEventListener('dragover', event => {
			event.preventDefault();
			event.currentTarget.classList.add('hover');
		});
		drop_area.addEventListener('dragleave', event => {
			event.preventDefault();
			event.currentTarget.classList.remove('hover');
		});
		setup_phase++;
	}
	/* [サイドバー] 本体を用意する */
	if (setup_phase <= PHASE_SIDEBAR_BODY) {
		generateSidebar(ids => {
			addIdsToForm(ids.join(' '));
		});
	}
};
setTimeout(setupToolFunctions, 100);


/* --- IDリストから重複を除去する --- */
const uniqueIdList = id_list => {
	/* IDを1つずつバラバラの配列にする */
	let p_list = null;
	if (typeof id_list == 'string') {
		p_list = [... id_list.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)];
		p_list = p_list.map(res => res[0]);
	} else {
		p_list = id_list;
	}
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


/* --- [ファイルID抽出] 抽出物を入力欄に追加する --- */
const extractIdsFromFiles = event => {
	if (event.dataTransfer.files.length <= 0) return;
	event.preventDefault();
	const extract_func = (name, event) => {
		const regexp       = /(?<=^|[^a-zA-Z0-9])((nc|im|sm|td)\d{2,12})(?=[^a-zA-Z0-9]|$)/g;
		const dropped_text = event.currentTarget.result.replace(/\x00/g, '');
		let ids_in_name  = [... name.matchAll(regexp)];
		let dropped_ids  = [... dropped_text.matchAll(regexp)];
		if (ids_in_name.length > 0) dropped_ids = ids_in_name;
		for (let index in dropped_ids) dropped_ids[index] = dropped_ids[index][1];
		addIdsToForm(uniqueIdList(dropped_ids).join(' '));
	}
	for (let file of event.dataTransfer.files) {
		const reader = new FileReader();
		reader.addEventListener('load', extract_func.bind(this, file.name));
		reader.readAsText(file);
	}
};


/* --- IDリストを公式のID入力欄に追加 --- */
const addIdsToForm = ids_text => {
	/* 処理中ならキューに入れておく */
	if (is_adding_ids) {
		queue.unshift(ids_text);
		return;
	}
	/* フォームに入れる */
	is_adding_ids = true;
	const form    = document.querySelector('input[name="keywords"]');
	if (form.value.length > 0 && !form.value.endsWith(' ')) form.value += ' ';
	form.value += ids_text;
	form.setAttribute('saved-value', form.value);
	form.focus({preventScroll:true});
	setTimeout(() => {
		form.value = form.getAttribute('saved-value');
		form.dispatchEvent(new Event('input' , {bubbles:true}));
		form.dispatchEvent(new Event('change', {bubbles:true}));
		form.blur();
		setTimeout(() => {
			is_adding_ids = false;
			if (queue.length > 0) addIdsToForm(queue.pop());
		}, 0);
	}, 0);
};
