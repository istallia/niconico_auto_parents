/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- サイドバー生成 --- */
const generateSidebar = listener_add_all => {
	/* 要素がなければ生成 */
	if (document.getElementById('ista-sidebar-bookmarks')) return;
	/* まずはベースを作成 */
	let div = document.createElement('div');
	div.id  = 'ista-sidebar-bookmarks';
	div.classList.add('ista-sidebar');
	document.body.appendChild(div);
	/* タイトルバーを作成 */
	let title = document.createElement('div');
	title.id  = 'ista-sidebar-bookmarks-title';
	title.classList.add('ista-sidebar-title');
	title.innerText = '(サイドバー タイトル)';
	div.appendChild(title);
	/* ボタン用エリアを作成 */
	let area_buttons   = document.createElement('div');
	let button_back    = document.createElement('button');
	let button_add_all = document.createElement('button');
	area_buttons.id    = 'ista-sidebar-bookmarks-buttons';
	area_buttons.classList.add('ista-sidebar-buttons');
	button_back.id    = 'ista-sidebar-bookmarks-button-back';
	button_add_all.id = 'ista-sidebar-bookmarks-button-add_all';
	button_back.classList.add('ista-button', 'white');
	button_add_all.classList.add('ista-button', 'white');
	button_back.innerText    = '戻る';
	button_add_all.innerText = 'すべて追加';
	button_back.addEventListener('click', event => {
		const i = String(document.getElementById('ista-sidebar-bookmarks-title').getAttribute('current-index'));
		document.getElementById('ista-sidebar-bookmarks-list-'+i).classList.remove('visible');
		document.getElementById('ista-sidebar-bookmarks-buttons').classList.remove('visible');
		document.getElementById('ista-sidebar-bookmarks-title').innerText = document.getElementById('ista-sidebar-bookmarks-title').getAttribute('sidebar-title');
		document.getElementById('ista-sidebar-bookmarks-folders').classList.add('visible');
	});
	button_add_all.addEventListener('click', listener_add_all);
	area_buttons.appendChild(button_back);
	area_buttons.appendChild(button_add_all);
	div.appendChild(area_buttons);
	/* フォルダ一覧の箱を作成 */
	let folders = document.createElement('div');
	folders.id  = 'ista-sidebar-bookmarks-folders';
	folders.classList.add('ista-sidebar-list', 'folders', 'visible');
	div.appendChild(folders);
};


/* --- [サイドバー] サイドバーを開く --- */
const openSidebar = (header_title, current_text_element, works_lists, listener_add_one) => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar-bookmarks')){
		return;
	} else if (document.getElementById('ista-sidebar-bookmarks').classList.contains('visible')) {
		closeSidebar();
		return;
	}
	let div_lists = [...document.getElementsByClassName('ista-sidebar-list')].filter(div => !div.classList.contains('folders'));
	div_lists.forEach(div => div.remove());
	[...document.getElementById('ista-sidebar-bookmarks-folders').children].forEach(div => div.remove());
	works_lists = works_lists.filter(dir => dir.list.length > 0);
	if (works_lists.length > 0) {
		/* フォルダ→作品一覧のイベント作成 */
		const openSidebarWorks = event => {
			const i = event.currentTarget.getAttribute('folder-index');
			document.getElementById('ista-sidebar-bookmarks-title').setAttribute('current-index', String(i));
			document.getElementById('ista-sidebar-bookmarks-title').innerText = event.currentTarget.innerText;
			document.getElementById('ista-sidebar-bookmarks-folders').classList.remove('visible');
			document.getElementById('ista-sidebar-bookmarks-buttons').classList.add('visible');
			[...document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).children].forEach(elem => {
				if (current_text_element.value.indexOf(elem.getAttribute('work-id')) > -1) {
					elem.classList.add('added');
				} else {
					elem.classList.remove('added');
				}
			});
			document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).classList.add('visible');
		};
		/* 作品クリックでIDを追加するイベントハンドラ */
		const addWorkFromBookmarks = listener_add_one;
		/* 作品一覧を生成 */
		works_lists.forEach((element, index) => {
			/* フォルダ要素を追加 */
			let folder       = document.createElement('div');
			folder.innerText = element.name;
			folder.setAttribute('folder-index', String(index));
			folder.addEventListener('click', openSidebarWorks);
			document.getElementById('ista-sidebar-bookmarks-folders').appendChild(folder);
			/* 作品一覧を追加 */
			let works = document.createElement('div');
			works.id  = 'ista-sidebar-bookmarks-list-' + String(index);
			works.classList.add('ista-sidebar-list');
			document.getElementById('ista-sidebar-bookmarks').appendChild(works);
			element.list.forEach(item => {
				let work       = document.createElement('div');
				work.innerText = item.label + '\n(' + item.id + ')';
				work.setAttribute('work-id', item.id);
				work.addEventListener('click', listener_add_one);
				works.appendChild(work);
			});
		});
	} else {
		/* ブックマーク内に作品が存在しない */
		let folder       = document.createElement('div');
		folder.innerText = 'ニコニコ作品が見つかりませんでした。';
		folder.classList.add('error');
		document.getElementById('ista-sidebar-bookmarks-folders').appendChild(folder);
	}
	/* サイドバーのベースを表示する */
	document.getElementById('ista-sidebar-bookmarks-title').innerText = header_title;
	document.getElementById('ista-sidebar-bookmarks-buttons').classList.remove('visible');
	document.getElementById('ista-sidebar-bookmarks').classList.add('visible');
	document.getElementById('ista-sidebar-bookmarks-folders').classList.add('visible');
	document.getElementById('ista-sidebar-bookmarks-title').setAttribute('sidebar-title', header_title);
};


/* --- [サイドバー] サイドバーを閉じる --- */
const closeSidebar = () => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar-bookmarks')) return;
	/* サイドバーのベースを表示する */
	document.getElementById('ista-sidebar-bookmarks').classList.remove('visible');
};
