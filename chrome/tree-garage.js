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
			<input type="text" id="ista-id-form" placeholder="作品ID(nc○○など)を入力してください (300件まで) / スペースで複数入力">&nbsp;
			<button type="button" id="ista-id-button">リストに追加</button>
			<button type="button" id="ista-close-button">閉じる</button>
		</div>
		<div class="ista-form ista-button-group">
			<button type="button" id="ista-open-sidebar-bookmarks-on-modal">ニコニコ・ブックマーク</button>
			<button type="button" id="ista-open-sidebar-exlists-on-modal">拡張マイリスト</button>
			<button type="button" id="ista-copy-works">作品リストをコピー</button>
			<span class="ista-list-info" id="ista-parent-list-count">(0 / 300 件)</span>
		</div>
		<div class="ista-parents-list">
			<div class="ista-parent-work template" id="ncXXXXXXXX">
				<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm0 7.425 2.717-2.718c.146-.146.339-.219.531-.219.404 0 .75.325.75.75 0 .193-.073.384-.219.531l-2.717 2.717 2.727 2.728c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.384-.073-.53-.219l-2.729-2.728-2.728 2.728c-.146.146-.338.219-.53.219-.401 0-.751-.323-.751-.75 0-.192.073-.384.22-.531l2.728-2.728-2.722-2.722c-.146-.147-.219-.338-.219-.531 0-.425.346-.749.75-.749.192 0 .385.073.531.219z" fill-rule="nonzero"/></svg>
				<img alt="サムネイル" class="ista-parent-img">
				<a href="https://commons.nicovideo.jp" class="ista-parent-link" target="_blank"><span class="ista-parent-title">読み込み中...</span></a>&nbsp;
				<span class="ista-parent-type">(読み込み中...)</span>
			</div>
		</div>
	</div>
`, 'text/html').querySelector('div.ista-tree-ui-modal');
const tree_ui_loading_img                  = tree_ui_modal.querySelector('div.ista-parent-work.template > img');
tree_ui_loading_img.style.backgroundImage  = `url('${browser.runtime.getURL('benricho-359-66.gif')}')`;
tree_ui_loading_img.style.backgroundRepeat = 'no-repeat';


/* --- 広域変数 --- */
const MAX_WORKS          = 300;
const queue              = [];
let nico_expansion_ready = false;


/* --- [nicoExpansion] インストール確認 --- */
browser.runtime.sendMessage({request:'get-exlists'}, response => nico_expansion_ready = Boolean(response));


/* --- フォームはオプションを開いたときのみ現れる --- */
const addIstaUIs = records => {
	/* 動画のオプションのメニューに追加 */
	const link_to_tree        = document.querySelector('li[role="menuitem"] > a[href^="https://commons.nicovideo.jp/tree/sm"]');
	const ista_tree_menuitems = document.getElementsByClassName('ista-menu-contents-tree');
	if (link_to_tree && ista_tree_menuitems.length < 1) {
		link_to_tree.getElementsByTagName('p')[0].innerText = 'コンテンツツリーを見る';
		const list_adding_tree    = link_to_tree.parentNode.cloneNode(true);
		const link_adding_tree    = list_adding_tree.getElementsByTagName('a')[0];
		const caption_adding_tree = link_adding_tree.getElementsByTagName('p')[0];
		list_adding_tree.classList.add('ista-menu-contents-tree');
		link_adding_tree.href         = link_adding_tree.href.replace('/tree/sm', '/tree/edit/sm');
		caption_adding_tree.innerText = '親作品を登録する';
		link_to_tree.parentNode.parentNode.insertBefore(list_adding_tree, link_to_tree.parentNode.nextElementSibling);
	}
	/* [ツリー登録UI] ついでにこれの要素も追加 */
	addTreeUI();
	/* 動画情報引用のためのイベントリスナ登録 */
	addQuotingEvents();
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
		const modal_window = document.getElementById('ista-tree-ui-modal');
		if (modal_window && !modal_window.classList.contains('hidden')) {
			addCardsToIstaUI(ids, true);
		} else {
			addQueue(ids);
		}
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
const root     = document.body;
const observer = new MutationObserver(addIstaUIs);
observer.observe(root, {
	childList : true,
	subtree   : true
});


/* --- [ツリー登録UI] UIを追加する --- */
const addTreeUI = () => {
	/* 既に存在したらスルー */
	const existed_ui = document.getElementById('ista-tree-ui-modal');
	const parent_el  = document.querySelector('div[role="presentation"] > div[role*="presentation"]');
	if (existed_ui || !parent_el) return;
	/* モーダルウィンドウを追加 */
	parent_el.appendChild(tree_ui_modal);
	/* 背景要素を追加 */
	const background = document.createElement('div');
	background.id    = 'ista-tree-ui-modal-background';
	background.classList.add('ista-tree-ui-modal-background', 'hidden');
	parent_el.appendChild(background);
	/* 閉じるボタンのイベントリスナを登録 */
	const close_button = tree_ui_modal.querySelector('#ista-close-button');
	close_button.addEventListener('click', closeTreeUI);
	background.addEventListener('click', closeTreeUI);
	/* IDリストから追加するためのイベントリスナを登録 */
	const add_works = () => {
		const form = document.getElementById('ista-id-form');
		const text = form.value;
		if (text.length < 3) return;
		const ids = [... text.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(id => id[0]);
		addCardsToIstaUI(ids, true);
		form.value = '';
	};
	tree_ui_modal.querySelector('#ista-id-button').addEventListener('click', add_works);
	tree_ui_modal.querySelector('#ista-id-form').addEventListener('keydown', event => {
		if (event.key.toLowerCase() === 'enter') {
			event.preventDefault();
			add_works();
		}
	});
	/* サイドバーを開くためのイベントリスナを登録 */
	const button_bookmarks = tree_ui_modal.querySelector('#ista-open-sidebar-bookmarks-on-modal');
	const button_exlists   = tree_ui_modal.querySelector('#ista-open-sidebar-exlists-on-modal');
	button_bookmarks.addEventListener('click', openSidebarBookmarks);
	button_exlists.addEventListener('click', openSidebarExLists);
	if (nico_expansion_ready) {
		button_exlists.classList.remove('hidden');
	} else {
		button_exlists.classList.add('hidden');
	}
	/* [ファイルID抽出] D&D監視イベント登録 */
	tree_ui_modal.addEventListener('dragover' , event => {
		event.preventDefault();
		event.currentTarget.classList.add('hover');
	});
	tree_ui_modal.addEventListener('dragleave', event => {
		event.preventDefault();
		event.currentTarget.classList.remove('hover');
	});
	tree_ui_modal.addEventListener('drop', extractIDsFromFiles);
	tree_ui_modal.addEventListener('drop', event => event.currentTarget.classList.remove('hover'));
	/* IDリストをコピーするボタンのイベントリスナを登録 */
	const button_copy = tree_ui_modal.querySelector('#ista-copy-works');
	button_copy.addEventListener('click', event => {
		const card_list = tree_ui_modal.querySelector('.ista-parents-list');
		if (card_list.children.length <= 1) {
			window.alert('コピーできる作品が1件もありません。');
			return;
		}
		const work_list     = [... card_list.children].filter(div => !div.classList.contains('template')).map(div => { return {id:div.id, title:div.querySelector('.ista-parent-title').innerText} });
		const include_title = window.confirm('作品名付きのリストをコピーしますか？\nキャンセルを選択するとIDのみのリストをコピーします。');
		if (include_title) {
			document.body.focus();
			setTimeout(() => {
				navigator.clipboard.writeText(work_list.map(work => `${work['id']} -> ${work['title']}`).join('\n'));
			}, 0);
		} else {
			const ids_text = work_list.reduce((text, work, i) => {
				if (i % 10 === 9) return text + work['id'] + '\n';
				return text + work['id'] + ' ';
			}, '');
			document.body.focus();
			setTimeout(() => {
				navigator.clipboard.writeText(ids_text.slice(0, -1));
			}, 0);
		}
	});
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
	form_official.value = '';
	form_official.setAttribute('saved-value', '');
	/* 親作品欄を同期 */
	const works_area    = modal_window.querySelector('#ista-tree-ui-modal div.ista-parents-list');
	const work_elements = modal_window.querySelectorAll('div.ista-parent-work:not(.template');
	work_elements.forEach(e => e.remove());
	const parent_el      = document.getElementById('commonsContentIdInput').parentNode.parentNode.parentNode;
	const official_works = [... parent_el.querySelectorAll('div.MuiPaper-root > div[role="button"]')];
	const official_ids   = official_works.map(official_el => official_el.querySelector('span').innerText);
	addCardsToIstaUI(official_ids);
	setTimeout(() => {
		works_area.scroll({
			top : 0
		});
	}, 0);
	/* UIを表示 */
	modal_window.classList.remove('hidden');
	background.classList.remove('hidden');
};


/* --- [ツリー登録UI] IDリストの親作品カードを生成 --- */
const addCardsToIstaUI = (ids, adding_official = false) => {
	ids                = Array.from(new Set(ids));
	const modal_window = document.getElementById('ista-tree-ui-modal');
	const works_area   = modal_window.querySelector('div.ista-parents-list');
	const existed_ids  = [... works_area.children].map(card => card.id);
	const filtered_ids = ids.map(id => id.toLowerCase()).filter(id => existed_ids.indexOf(id) < 0).slice(0, MAX_WORKS-existed_ids.length);
	if (filtered_ids.length < 1) return;
	const unknown_works = [];
	const cached_works  = [];
	const work_template = modal_window.querySelector('div.ista-parent-work.template');
	filtered_ids.forEach(work_id => {
		const work_card = work_template.cloneNode(true);
		const rm_button = work_card.querySelector('svg');
		work_card.id    = work_id;
		work_card.classList.remove('template');
		rm_button.setAttribute('work-id', work_id);
		rm_button.addEventListener('click', event => {
			const removing_id = event.currentTarget.getAttribute('work-id');
			const parent_el   = document.getElementById('commonsContentIdInput').parentNode.parentNode.parentNode;
			const parent_cn   = parent_el.querySelector('div.MuiPaper-root');
			if (parent_cn) {
				const official_el = [... parent_cn.children].find(el => el.querySelector('span').innerText === removing_id);
				if (official_el) {
					official_el.querySelector('svg > path').dispatchEvent(new Event('click', {bubbles:true}));
				}
			}
			event.currentTarget.parentNode.remove();
			modal_window.querySelector('span#ista-parent-list-count').innerText = `(${works_area.children.length-1} / ${MAX_WORKS} 件)`;
		});
		works_area.appendChild(work_card);
		let work_info = sessionStorage.getItem(`ista-tree-cache-${work_id}`);
		if (work_info) {
			work_info       = JSON.parse(work_info);
			const img       = work_card.querySelector('img.ista-parent-img');
			const link      = work_card.querySelector('a.ista-parent-link');
			const title     = work_card.querySelector('span.ista-parent-title');
			const type      = work_card.querySelector('span.ista-parent-type');
			img.setAttribute('alt', work_info['id']);
			img.src         = work_info['thum'];
			link.href       = work_info['url'];
			title.innerText = work_info['title'];
			type.innerText  = `(${work_info['type']})`;
			cached_works.push(work_id);
		} else {
			work_card.classList.add('loading');
			unknown_works.push(work_id);
		}
	});
	/* 末尾までスクロール */
	works_area.scroll({
		top : works_area.scrollHeight - works_area.clientHeight
	});
	/* 通信しないならここで公式のフォームに入れてしまう */
	const form        = document.getElementById('commonsContentIdInput');
	const form_button = document.getElementById('commonsContentIdInputButton');
	if (adding_official && unknown_works.length < 1) {
		const cached_works_text = cached_works.join(' ');
		form.value = cached_works_text;
		form.setAttribute('saved-value', cached_works_text);
		form.focus();
		setTimeout(() => {
			form_button.dispatchEvent(new Event('click', {bubbles:true}));
		});
	}
	/* 親作品欄用のキャッシュがなければ通信で取得 */
	if (unknown_works.length > 0) {
		browser.runtime.sendMessage({request:'get-tree-list', ids:unknown_works}, response => {
			response.forEach(work_info => {
				const work_card = modal_window.querySelector(`div#${work_info["id"]}.ista-parent-work`);
				const img       = work_card.querySelector('img.ista-parent-img');
				const link      = work_card.querySelector('a.ista-parent-link');
				const title     = work_card.querySelector('span.ista-parent-title');
				const type      = work_card.querySelector('span.ista-parent-type');
				img.setAttribute('alt', work_info['id']);
				img.src         = work_info['thum'];
				link.href       = work_info['url'];
				title.innerText = work_info['title'];
				type.innerText  = `(${work_info['type']})`;
				work_card.classList.remove('loading');
				sessionStorage.setItem(`ista-tree-cache-${work_info["id"]}`, JSON.stringify(work_info));
			});
			const removed_ids = [];
			[... modal_window.querySelectorAll('div.ista-parent-work.loading')].forEach(removed_work => {
				removed_ids.push(removed_work.id);
				const parent_element   = document.getElementById('commonsContentIdInput').parentNode.parentNode.parentNode;
				const parent_container = parent_element.querySelector('div.MuiPaper-root');
				if (parent_container) {
					const official_element = [... parent_container.children].find(el => el.querySelector('span').innerText === removed_work.id);
					if (official_element) {
						official_element.querySelector('svg > path').dispatchEvent(new Event('click', {bubbles:true}));
					}
				}
				removed_work.remove();
			});
			if (adding_official) {
				const added_ids      = response.map(info => info['id']);
				const all_works_text = filtered_ids.filter(id => removed_ids.indexOf(id) < 0).join(' ');
				form.value = all_works_text;
				form.setAttribute('saved-value', all_works_text);
				form.focus();
				setTimeout(() => {
					form_button.dispatchEvent(new Event('click', {bubbles:true}));
				});
			}
			modal_window.querySelector('span#ista-parent-list-count').innerText = `(${works_area.children.length-1} / ${MAX_WORKS} 件)`;
		});
	} else {
		modal_window.querySelector('span#ista-parent-list-count').innerText = `(${works_area.children.length-1} / ${MAX_WORKS} 件)`;
	}
};


/* --- [ツリー登録UI] UIを閉じて反映 --- */
const closeTreeUI = () => {
	/* UIの要素を取得 */
	const modal_window = document.getElementById('ista-tree-ui-modal');
	const background   = document.getElementById('ista-tree-ui-modal-background');
	if (!modal_window) return;
	/* 入力欄を同期 */
	const form_official = document.getElementById('commonsContentIdInput');
	const form_modal    = modal_window.querySelector('#ista-id-form');
	form_official.value = form_modal.value;
	form_official.setAttribute('saved-value', form_modal.value);
	setTimeout(() => {
		form_official.focus();
	}, 0);
	/* サイドバーを閉じる */
	closeSidebar();
	/* UIを非表示 */
	modal_window.classList.add('hidden');
	background.classList.add('hidden');
};


/* --- 動画情報引用のためのイベントリスナ登録 --- */
const addQuotingEvents = () => {
	/* 引用ボタンを押したらオプションを開いておく */
	const quote_button = [... document.querySelectorAll('button.MuiButtonBase-root.MuiButton-root.MuiButton-text:not(.ista-event-registed)')].filter(button => button.innerText === '投稿した動画から選択')[0];
	if (quote_button) {
		quote_button.classList.add('ista-event-registed');
		quote_button.addEventListener('click', event => {
			const open_detail_button = [... document.querySelectorAll('button.MuiButtonBase-root.MuiButton-root.MuiButton-text')].filter(button => button.innerText === 'オプションを開く');
			if (open_detail_button.length > 0) {
				open_detail_button[0].dispatchEvent(new Event('click', {bubbles:true}));
			}
		});
	}
	/* 親作品引用のオン/オフを切り替えるチェックボックスを追加 */
	if (quote_button && !document.getElementById('ista-enable-quoting-parents')) {
		const checkbox   = document.createElement('input');
		const label      = document.createElement('label');
		const div        = document.createElement('div');
		const caption    = document.createTextNode('[拡張機能] 動画情報の引き継ぎ時に親作品も引き継ぐ');
		checkbox.id      = 'ista-enable-quoting-parents';
		checkbox.type    = 'checkbox';
		label.for        = 'ista-enable-quoting-parents';
		label.title      = '(v0.6.1～) 上のボタンから過去の投稿動画の情報を引き継ぐ際、親作品も一緒に引き継ぎます。';
		div.classList.add('ista-checkbox-div');
		label.appendChild(checkbox);
		label.appendChild(caption);
		div.appendChild(label);
		quote_button.parentNode.appendChild(div);
		checkbox.addEventListener('change', event => {
			localStorage.setItem('ista-enable-quoting-parents', String(event.currentTarget.checked));
		});
		setTimeout(() => {
			checkbox.checked = localStorage.getItem('ista-enable-quoting-parents') === 'true';
		}, 0);
	}
	/* リストの各要素にイベントを追加 (IDをフォームに入力) */
	const quote_parents = event => {
		/* 無効なら帰る */
		const enable_checkbox = document.getElementById('ista-enable-quoting-parents');
		if (!enable_checkbox?.checked) return;
		/* 動画IDを取得 */
		const thumbnail = event.currentTarget.querySelector('div[src^="https://nicovideo.cdn.nimg.jp/thumbnails/"]');
		const video_id  = 'sm' + thumbnail.getAttribute('src').match(/(?<=\/)\d+/)[0];
		/* パラメータを準備 */
		const params = new URLSearchParams({
			_offset   : 0,
			_limit    : 300,
			with_meta : 0,
			_sort     : '-id'
		});
		/* 送信 */
		fetch(`https://public-api.commons.nicovideo.jp/v1/tree/${video_id}/relatives/parents?${params.toString()}`, {
			mode        : 'cors',
			credentials : 'include',
			cache       : 'no-cache'
		})
		.catch(err => {
			window.alert('サーバーに接続できませんでした。インターネット接続を確認してください。');
			console.log(err);
			return null;
		})
		.then(response => response.json())
		.then(json => {
			/* IDリストの文字列を取得 */
			let id_list = json.data.parents.contents.map(work => work.globalId);
			addQueue(id_list, true);
		});
	};
	const video_divs = [... document.querySelectorAll('div[role="dialog"] ul.MuiList-root.MuiList-padding > .MuiButtonBase-root.MuiListItem-root.MuiListItem-button:not(.ista-event-registed)')];
	video_divs.forEach(div => {
		div.classList.add('ista-event-registed');
		div.addEventListener('click', quote_parents);
	});
};


/* --- [ニコニコ・ブックマーク] サイドバーを開く --- */
const openSidebarBookmarks = () => {
	/* ブックマーク内の作品一覧を取得 */
	browser.runtime.sendMessage({request:'get-bookmarks'}, response => {
		const current_text = document.getElementById('commonsContentIdInput');
		openSidebar('ニコニコ・ブックマーク', () => {
			const official_id_list = [... current_text.value.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(id => id[0]);
			const modal_window = document.getElementById('ista-tree-ui-modal');
			if (modal_window && !modal_window.classList.contains('hidden')) {
				const tree_ui_works_area = modal_window.querySelector('div.ista-parents-list');
				const tree_ui_id_list    = [... tree_ui_works_area.children].map(el => el.id);
				return official_id_list.concat(tree_ui_id_list);
			} else {
				return official_id_list;
			}
		}, response, id => {
			const modal_window = document.getElementById('ista-tree-ui-modal');
			if (modal_window && !modal_window.classList.contains('hidden')) {
				addCardsToIstaUI([id], true);
			} else {
				addQueue([id]);
			}
		});
	});
};


/* --- [nicoExpansion] サイドバーを開く --- */
const openSidebarExLists = () => {
	/* 拡張マイリストを取得 */
	browser.runtime.sendMessage({request:'get-exlists'}, response => {
		const current_text = document.getElementById('commonsContentIdInput');
		openSidebar('拡張マイリスト', () => {
			const official_id_list = [... current_text.value.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(id => id[0]);
			const modal_window = document.getElementById('ista-tree-ui-modal');
			if (modal_window && !modal_window.classList.contains('hidden')) {
				const tree_ui_works_area = modal_window.querySelector('div.ista-parents-list');
				const tree_ui_id_list    = [... tree_ui_works_area.children].map(el => el.id);
				return official_id_list.concat(tree_ui_id_list);
			} else {
				return official_id_list;
			}
		}, response, id => {
			const modal_window = document.getElementById('ista-tree-ui-modal');
			if (modal_window && !modal_window.classList.contains('hidden')) {
				addCardsToIstaUI([id], true);
			} else {
				addQueue([id]);
			}
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
		const modal_window = document.getElementById('ista-tree-ui-modal');
		if (modal_window && !modal_window.classList.contains('hidden')) {
			addCardsToIstaUI(dropped_ids, true);
		} else {
			addQueue(dropped_ids);
		}
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
const addQueue = (ids, exec_overwrite = false) => {
	ids = Array.from(new Set(ids));
	queue.unshift(ids);
	if (queue.length === 1) addIdsToList(exec_overwrite);
};


/* --- IDリストをhtmlのリストに追加 --- */
const addIdsToList = (exec_overwrite = false) => {
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
		if (exec_overwrite) {
			const parent_element  = document.getElementById('commonsContentIdInput').parentNode.parentNode.parentNode;
			const id_list_element = parent_element.querySelector('div.MuiPaper-root');
			const form_button     = document.getElementById('commonsContentIdInputButton');
			if (id_list_element) {
				const rm_process = [... id_list_element.children].reverse().map(div => div.querySelector('svg > path')).reduce((promise, path) => {
					return promise.then(() => {
						setTimeout(() => path.dispatchEvent?.(new Event('click', {bubbles:true})), 0);
					});
				}, Promise.resolve());
				rm_process.then(() => {
					setTimeout(() => {
						form_button.dispatchEvent(new Event('click', {bubbles:true}));
					}, 0);
				});
			} else {
				form_button.dispatchEvent(new Event('click', {bubbles:true}));
			}
		}
	}, 0);
};
