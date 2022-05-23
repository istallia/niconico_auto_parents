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
		document.getElementById('ista-sidebar-bookmarks-title').innerText = '(サイドバー タイトル)';
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