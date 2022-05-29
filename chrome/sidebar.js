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


/* --- 拡張マイリストのキャッシュ --- */
const expanded_mylist_cache = {};


/* --- サイドバー生成 --- */
const generateSidebar = listener_add_all => {
	/* 要素がなければ生成 */
	if (document.getElementById('ista-sidebar')) return;
	/* まずはベースを作成 */
	let div = document.createElement('div');
	div.id  = 'ista-sidebar';
	div.classList.add('ista-sidebar');
	document.body.appendChild(div);
	/* タイトルバーを作成 */
	let title = document.createElement('div');
	title.id  = 'ista-sidebar-title';
	title.classList.add('ista-sidebar-title');
	title.innerText = '(サイドバー タイトル)';
	div.appendChild(title);
	/* ボタン用エリアを作成 */
	let area_buttons   = document.createElement('div');
	let button_back    = document.createElement('button');
	let button_add_all = document.createElement('button');
	area_buttons.id    = 'ista-sidebar-buttons';
	area_buttons.classList.add('ista-sidebar-buttons');
	button_back.id    = 'ista-sidebar-button-back';
	button_add_all.id = 'ista-sidebar-button-add_all';
	button_back.classList.add('ista-button', 'white');
	button_add_all.classList.add('ista-button', 'white');
	button_back.innerText    = '戻る';
	button_add_all.innerText = 'すべて追加';
	button_back.addEventListener('click', listener_back);
	button_add_all.addEventListener('click', event => {
		const visible_list = document.querySelector('.ista-sidebar-list.visible');
		let works          = [...visible_list.children].filter(elem => !elem.classList.contains('added') && /[A-Za-z]{2}\d{1,12}/.test(elem.getAttribute('work-id')));
		works              = works.map(elem => {
			elem.classList.add('added');
			return elem.getAttribute('work-id');
		});
		listener_add_all(works);
	});
	area_buttons.appendChild(button_back);
	area_buttons.appendChild(button_add_all);
	div.appendChild(area_buttons);
	/* フォルダ一覧の箱を作成 */
	let folders = document.createElement('div');
	folders.id  = 'ista-sidebar-folders';
	folders.classList.add('ista-sidebar-list', 'folders', 'visible');
	div.appendChild(folders);
};


/* --- 「戻る」ボタン --- */
const listener_back = event => {
	const sidebar_title = document.getElementById('ista-sidebar-title');
	const i = String(sidebar_title.getAttribute('current-index'));
	if (sidebar_title.getAttribute('expanded-list') === 'true') {
		/* 展開マイリスト→元のリスト */
		document.getElementById('ista-sidebar-list-ex').classList.remove('visible');
		document.getElementById('ista-sidebar-list-'+i).classList.add('visible');
		sidebar_title.innerText = sidebar_title.getAttribute('sidebar-folder-title');
		sidebar_title.setAttribute('expanded-list', 'false');
	} else {
		/* リスト→フォルダ一覧 */
		document.getElementById('ista-sidebar-list-'+i).classList.remove('visible');
		document.getElementById('ista-sidebar-buttons').classList.remove('visible');
		sidebar_title.innerText = sidebar_title.getAttribute('sidebar-title');
		document.getElementById('ista-sidebar-folders').classList.add('visible');
	}
}


/* --- [サイドバー] サイドバーを開く --- */
const openSidebar = (header_title, current_text_element, works_lists, listener_add_one) => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar')){
		return;
	} else if (document.getElementById('ista-sidebar').classList.contains('visible')) {
		closeSidebar();
		return;
	}
	let div_lists = [...document.getElementsByClassName('ista-sidebar-list')].filter(div => !div.classList.contains('folders'));
	div_lists.forEach(div => div.remove());
	[...document.getElementById('ista-sidebar-folders').children].forEach(div => div.remove());
	works_lists = works_lists.filter(dir => dir.list.length > 0);
	if (works_lists.length > 0) {
		/* フォルダ→作品一覧のイベント作成 */
		const openSidebarWorks = event => {
			const i = event.currentTarget.getAttribute('folder-index');
			document.getElementById('ista-sidebar-title').setAttribute('current-index', String(i));
			document.getElementById('ista-sidebar-title').innerText = event.currentTarget.innerText;
			document.getElementById('ista-sidebar-folders').classList.remove('visible');
			document.getElementById('ista-sidebar-buttons').classList.add('visible');
			[...document.getElementById('ista-sidebar-list-'+String(i)).children].forEach(elem => {
				if (current_text_element.value.indexOf(elem.getAttribute('work-id')) > -1) {
					elem.classList.add('added');
				} else {
					elem.classList.remove('added');
				}
			});
			document.getElementById('ista-sidebar-list-'+String(i)).classList.add('visible');
		};
		/* 作品一覧を生成 */
		works_lists.forEach((element, index) => {
			/* フォルダ要素を追加 */
			let folder       = document.createElement('div');
			folder.innerText = element.name;
			folder.setAttribute('folder-index', String(index));
			folder.addEventListener('click', openSidebarWorks);
			document.getElementById('ista-sidebar-folders').appendChild(folder);
			/* 作品一覧を追加 */
			let works = document.createElement('div');
			works.id  = 'ista-sidebar-list-' + String(index);
			works.classList.add('ista-sidebar-list');
			document.getElementById('ista-sidebar').appendChild(works);
			element.list.forEach(item => {
				let work       = document.createElement('div');
				work.innerText = item.label + '\n(' + item.id + ')';
				work.setAttribute('work-id', item.id);
				work.addEventListener('click', event => {
					const id = event.currentTarget.getAttribute('work-id');
					if (/^[A-Za-z]{2}\d{1,12}$/.test(id)) {
						listener_add_one(id);
						event.currentTarget.classList.add('added');
					} else {
						openExpandedMylist(id, current_text_element, listener_add_one);
					}
				});
				works.appendChild(work);
			});
		});
		/* 展開マイリスト用のエリアを生成 */
		let expanded_list = document.createElement('div');
		expanded_list.id  = 'ista-sidebar-list-ex';
		expanded_list.classList.add('ista-sidebar-list');
		document.getElementById('ista-sidebar').appendChild(expanded_list);
	} else {
		/* ブックマーク内に作品が存在しない */
		let folder       = document.createElement('div');
		folder.innerText = 'ニコニコ作品が見つかりませんでした。';
		folder.classList.add('error');
		document.getElementById('ista-sidebar-folders').appendChild(folder);
	}
	/* サイドバーのベースを表示する */
	document.getElementById('ista-sidebar-title').innerText = header_title;
	document.getElementById('ista-sidebar-buttons').classList.remove('visible');
	document.getElementById('ista-sidebar').classList.add('visible');
	document.getElementById('ista-sidebar-folders').classList.add('visible');
	document.getElementById('ista-sidebar-title').setAttribute('sidebar-title', header_title);
};


/* --- [サイドバー] 展開マイリストを開く --- */
const openExpandedMylist = (list_id, current_text_element, listener_add_one) => {
	/* 元のリストの要素を隠す */
	const sidebar_title = document.getElementById('ista-sidebar-title');
	const i = String(sidebar_title.getAttribute('current-index'));
	document.getElementById('ista-sidebar-list-'+i).classList.remove('visible');
	/* 展開マイリストの要素を開く処理 */
	const works = document.getElementById('ista-sidebar-list-ex');
	const setExpandedMylist = list => {
		[... works.children].forEach(work => work.remove());
		list.list.forEach(item => {
			let work       = document.createElement('div');
			work.innerText = item.label + '\n(' + item.id + ')';
			work.setAttribute('work-id', item.id);
			work.addEventListener('click', event => {
				const id = event.currentTarget.getAttribute('work-id');
				listener_add_one(id);
				event.currentTarget.classList.add('added');
			});
			if (current_text_element.value.indexOf(item.id) > -1) work.classList.add('added');
			works.appendChild(work);
		});
		sidebar_title.setAttribute('expanded-list', 'true');
		document.getElementById('ista-sidebar-list-ex').classList.add('visible');
		sidebar_title.setAttribute('sidebar-folder-title', sidebar_title.innerText);
		sidebar_title.innerText = list.name;
	};
	/* --- 表示する情報を取得 --- */
	if (expanded_mylist_cache[list_id]) {
		setExpandedMylist(expanded_mylist_cache[list_id]);
	} else {
		browser.runtime.sendMessage({request:'get-expanded-list', id:list_id}, response => {
			if (response) {
				setExpandedMylist(response);
				expanded_mylist_cache[list_id] = response;
			}
		});
	}
};


/* --- [サイドバー] サイドバーを閉じる --- */
const closeSidebar = () => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar')) return;
	/* サイドバーのベースを表示する */
	document.getElementById('ista-sidebar').classList.remove('visible');
};
