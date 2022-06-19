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


/* --- [ツリー登録UI] UIのベース --- */
const parser        = new DOMParser();
const tree_ui_modal = parser.parseFromString(`
	<div class="ista-tree-ui-modal hidden" id="ista-tree-ui-modal">
		<div class="ista-form ista-id-form">
			<input type="text" id="ista-id-form">&nbsp;
			<button type="button" id="ista-id-button">リストに追加</button>
			<button type="button" id="ista-close-button">閉じる</button>
		</div>
		<div class="ista-form ista-button-group">
			<button type="button" id="ista-open-sidebar-bookmarks-on-modal">ニコニコ・ブックマーク</button>
			<button type="button" id="ista-open-sidebar-exlists-on-modal">拡張マイリスト</button>
		</div>
		<div class="ista-parents-list">
			<div class="ista-parent-work template" id="nc235560">
				<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm0 7.425 2.717-2.718c.146-.146.339-.219.531-.219.404 0 .75.325.75.75 0 .193-.073.384-.219.531l-2.717 2.717 2.727 2.728c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.384-.073-.53-.219l-2.729-2.728-2.728 2.728c-.146.146-.338.219-.53.219-.401 0-.751-.323-.751-.75 0-.192.073-.384.22-.531l2.728-2.728-2.722-2.722c-.146-.147-.219-.338-.219-.531 0-.425.346-.749.75-.749.192 0 .385.073.531.219z" fill-rule="nonzero"/></svg>
				<img src="https://deliver.commons.nicovideo.jp/thumbnail/nc235560" alt="サムネイル" class="ista-parent-img">
				<a href="https://commons.nicovideo.jp/material/nc235560" class="ista-parent-link"><span class="ista-parent-title">コンテンツツリー登録支援ツール</span></a>&nbsp;
				<span class="ista-parent-type">(ニコニ・コモンズ作品)</span>
			</div>
		</div>
	</div>
`, 'text/html').querySelector('div.ista-tree-ui-modal');


/* --- 広域変数 --- */
const queue                 = [];
const official_work_buttons = {};
let nico_expansion_ready    = false;


/* --- [nicoExpansion] インストール確認 --- */
browser.runtime.sendMessage({request:'get-exlists'}, response => nico_expansion_ready = Boolean(response));


/* --- フォームはオプションを開いたときのみ現れる --- */
const addIstaUIs = records => {
	/* [ツリー登録UI] ついでにこれの要素も追加 */
	addTreeUI();
	/* 親を探す */
	const input        = document.getElementById('commonsContentIdInput');
	const exist_button = document.getElementById('ista-open-sidebar-bookmarks');
	if (!input || exist_button) return;
	const frame = input.parentNode.parentNode.parentNode;
	/* [ツリー登録UI] ボタンを生成 */
	const button_treeUI     = document.createElement('button');
	button_treeUI.innerText = '[拡張機能] ツリー登録UI';
	button_treeUI.id        = 'ista-open-tree-ui';
	button_treeUI.classList.add('ista-button-garage', 'MuiButtonBase-root', 'MuiButton-root', 'MuiButton-text');
	button_treeUI.addEventListener('click', openTreeUI);
	frame.appendChild(button_treeUI);
	/* [ニコニコ・ブックマーク] ボタンを生成 */
	const button_bookmarks     = document.createElement('button');
	button_bookmarks.innerText = '[拡張機能] ニコニコ・ブックマーク';
	button_bookmarks.id        = 'ista-open-sidebar-bookmarks';
	button_bookmarks.classList.add('ista-button-garage', 'MuiButtonBase-root', 'MuiButton-root', 'MuiButton-text');
	button_bookmarks.addEventListener('click', openSidebarBookmarks);
	frame.appendChild(button_bookmarks);
	/* [nicoExpansion] ボタンを生成 */
	if (nico_expansion_ready) {
		const button_exlists     = document.createElement('button');
		button_exlists.innerText = '[拡張機能] 拡張マイリスト';
		button_exlists.id        = 'ista-open-sidebar-exlists';
		button_exlists.classList.add('ista-button-garage', 'MuiButtonBase-root', 'MuiButton-root', 'MuiButton-text');
		button_exlists.addEventListener('click', openSidebarExLists);
		frame.appendChild(button_exlists);
	}
	/* [サイドバー] サイドバーを生成 */
	generateSidebar(ids => {
		addQueue(ids);
	});
	/* [ファイルID抽出] D&D時の色変え */
	frame.addEventListener('dragover' , event => {
		event.preventDefault();
		event.currentTarget.classList.add('hover');
	});
	frame.addEventListener('dragleave', event => {
		event.preventDefault();
		event.currentTarget.classList.remove('hover');
	});
	/* [ファイルID抽出] D&D監視イベント登録 */
	frame.addEventListener('drop', extractIDsFromFiles);
	frame.addEventListener('drop', event => event.currentTarget.classList.remove('hover'));
	/* 入力欄のID維持のためのイベントリスナ */
	const add_button   = input.nextElementSibling.querySelector('button');
	add_button.id      = 'commonsContentIdInputButton';
	const record_event = event => {
		const target = event.currentTarget;
		target.setAttribute('saved-value', target.value);
	};
	const load_event = event => {
		const target    = event.currentTarget;
		const lastValue = target.getAttribute('saved-value');
		if (target.value = lastValue) {
			setTimeout(() => {
				target.value = lastValue;
				target.dispatchEvent(new Event('input', {bubbles:true}));
				target.dispatchEvent(new Event('change', {bubbles:true}));
			}, 0);
		}
	};
	add_button.addEventListener('click', event => {
		input.setAttribute('saved-value', '');
	});
	input.addEventListener('input', record_event);
	input.addEventListener('change', record_event);
	input.addEventListener('focus', load_event);
	input.addEventListener('blur', load_event);
};
const root     = document.getElementById('root');
const observer = new MutationObserver(addIstaUIs);
observer.observe(root, {
	childList : true,
	subtree   : true
});


/* --- [ツリー登録UI] UIを追加する --- */
const addTreeUI = () => {
	/* 既に存在したらスルー */
	const existed_ui = document.getElementById('ista-tree-ui-modal');
	if (existed_ui) return;
	/* モーダルウィンドウを追加 */
	document.body.appendChild(tree_ui_modal);
	/* 背景要素を追加 */
	const background = document.createElement('div');
	background.id    = 'ista-tree-ui-modal-background';
	background.classList.add('ista-tree-ui-modal-background', 'hidden');
	document.body.appendChild(background);
	/* ボタンのイベントリスナを登録 */
	const close_button = tree_ui_modal.querySelector('#ista-close-button');
	close_button.addEventListener('click', closeTreeUI);
	background.addEventListener('click', closeTreeUI);
};


/* --- [ツリー登録UI] UIを開く --- */
const openTreeUI = () => {
	/* UIの要素を取得 */
	const modal_window = document.getElementById('ista-tree-ui-modal');
	const background   = document.getElementById('ista-tree-ui-modal-background');
	if (!modal_window) return;
	/* [nicoExpansion] インストールされてなかったらボタンを非表示 */
	const button_exlists = modal_window.querySelector('#ista-open-sidebar-exlists-on-modal');
	if (nico_expansion_ready) {
		button_exlists.classList.remove('hidden');
	} else {
		button_exlists.classList.add('hidden');
	}
	/* 入力欄を同期 */
	const form_official = document.getElementById('commonsContentIdInput');
	const form_modal    = modal_window.querySelector('#ista-id-form');
	form_modal.value    = form_official.value;
	/* 親作品欄を同期 */
	const unknown_works = [];
	const works_area    = modal_window.querySelector('div.ista-parents-list');
	const work_template = modal_window.querySelector('div.ista-parent-work.template');
	const work_elements = modal_window.querySelectorAll('div.ista-parent-work:not(.template');
	work_elements.forEach(e => e.remove());
	const official_works = [... document.querySelectorAll('div.MuiPaper-root > div[role="button"]')];
	official_works.forEach(work_element => {
		const work_card   = work_template.cloneNode(true);
		const work_id     = work_element.querySelector('span').innerText;
		const work_button = work_element.querySelector('path');
		work_card.id      = work_id;
		work_card.classList.remove('template');
		works_area.appendChild(work_card);
		let work_info = sessionStorage.getItem(`ista-tree-cache-${work_id}`);
		if (work_info) {
			work_info   = JSON.parse(work_info);
			const img   = work_card.querySelector('img.ista-parent-img');
			const link  = work_card.querySelector('a.ista-parent-link');
			const title = work_card.querySelector('span.ista-parent-title');
			const type  = work_card.querySelector('span.ista-parent-type');
			img.setAttribute('alt', work_info['id']);
			img.src         = work_info['thum'];
			link.href       = work_info['url'];
			title.innerText = work_info['title'];
			type.innerText  = work_info['type'];
		} else {
			unknown_works.push(work_id);
		}
		official_work_buttons[work_id] = work_button;
	});
	/* 親作品欄用のキャッシュがなければ通信で取得 */
	if (unknown_works.length > 0) {
		browser.runtime.sendMessage({request:'get-tree-list', ids:unknown_works}, response => {
			response.forEach(work_info => {
				const work_card = modal_window.querySelector(`div#${work_info["id"]}.ista-parent-work`);
				const img   = work_card.querySelector('img.ista-parent-img');
				const link  = work_card.querySelector('a.ista-parent-link');
				const title = work_card.querySelector('span.ista-parent-title');
				const type  = work_card.querySelector('span.ista-parent-type');
				img.setAttribute('alt', work_info['id']);
				img.src         = work_info['thum'];
				link.href       = work_info['url'];
				title.innerText = work_info['title'];
				type.innerText  = work_info['type'];
				sessionStorage.setItem(`ista-tree-cache-${work_info["id"]}`, JSON.stringify(work_info));
			});
		});
	}
	/* UIを表示 */
	modal_window.classList.remove('hidden');
	background.classList.remove('hidden');
};


/* --- [ツリー登録UI] UIを閉じて反映 --- */
const closeTreeUI = () => {
	/* UIの要素を取得 */
	const modal_window = document.getElementById('ista-tree-ui-modal');
	const background   = document.getElementById('ista-tree-ui-modal-background');
	if (!modal_window) return;
	/* UIを非表示 */
	modal_window.classList.add('hidden');
	background.classList.add('hidden');
};


/* --- [ニコニコ・ブックマーク] サイドバーを開く --- */
const openSidebarBookmarks = () => {
	/* ブックマーク内の作品一覧を取得 */
	browser.runtime.sendMessage({request:'get-bookmarks'}, response => {
		const current_text = document.getElementById('commonsContentIdInput');
		openSidebar('ニコニコ・ブックマーク', current_text, response, id => {
			const area_list = document.getElementById('commonsContentIdInput');
			addQueue([id]);
		});
	});
};


/* --- [nicoExpansion] サイドバーを開く --- */
const openSidebarExLists = () => {
	/* 拡張マイリストを取得 */
	browser.runtime.sendMessage({request:'get-exlists'}, response => {
		const current_text = document.getElementById('commonsContentIdInput');
		openSidebar('拡張マイリスト', current_text, response, id => {
			const area_list = document.getElementById('commonsContentIdInput');
			addQueue([id]);
		});
	});
};


/* --- [ファイルID抽出] D&DでファイルからID抽出 --- */
const extractIDsFromFiles = event => {
	if (event.dataTransfer.files.length <= 0) return;
	event.preventDefault();
	const extract_func = (name, event) => {
		const regexp       = /(?<=^|[^a-zA-Z0-9])((nc|im|sm|td)\d{2,12})(?=[^a-zA-Z0-9]|$)/g;
		const dropped_text = event.currentTarget.result.replace(/\x00/g, '');
		let ids_in_name  = [... name.matchAll(regexp)];
		let dropped_ids  = [... dropped_text.matchAll(regexp)];
		if (ids_in_name.length > 0) dropped_ids = ids_in_name;
		for (let index in dropped_ids) dropped_ids[index] = dropped_ids[index][1];
		addQueue(dropped_ids);
	}
	for (let file of event.dataTransfer.files) {
		const reader = new FileReader();
		reader.addEventListener('load', extract_func.bind(this, file.name));
		reader.readAsText(file);
	}
};


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
	const garage_list = [... document.getElementById('commonsContentIdInput').value.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(res => res[0]);
	ok_list.filter(id => !garage_list.includes(id));
	/* 1行で返す */
	return ok_list.join(' ');
};


/* --- キューを追加 --- */
const addQueue = ids => {
	queue.unshift(ids);
	if (queue.length === 1) addIdsToList();
};


/* --- IDリストをhtmlのリストに追加 --- */
const addIdsToList = () => {
	/* キューを全部取得 */
	const processed_queue = queue.concat([]).flat();
	queue.splice(0);
	const ids_list = processed_queue.join(' ');
	/* フォームにぶち込む */
	const form = document.getElementById('commonsContentIdInput');
	if (form.value.length > 0 && !form.value.endsWith(' ')) form.value += ' ';
	form.value += ids_list;
	form.setAttribute('saved-value', form.value);
	form.focus({preventScroll:true});
	setTimeout(() => {
		form.blur();
	}, 0);
};
