/*
 * Step01 入力されたIDリストをフォームに自動入力し「候補に追加」する
 */

/* --- ボタンを押すと開始する --- */
document.addEventListener('DOMContentLoaded', () => {
	if( location.href.slice(0,37) === 'http://commons.nicovideo.jp/tree/edit' ) {
		/* 実行のためのボタンを追加 */
		let button       = document.createElement('button');
		button.innerText = '自動入力';
		let parent = document.getElementsByClassName('search-parent')[0];
		let head   = parent.firstElementChild;
		parent.insertBefore(button, head.nextSibling);
		button.addEventListener('click', () => {
			auto_switch_mode();
			auto_type_ids();
			auto_search();
		});
	}
});

/* --- 「IDから指定」に切り替え --- */
let auto_switch_mode = () => {
	let select = document.getElementById('site_selector');
	select.selectedIndex = select.options.length - 1;
	select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
};

/* --- 入力されたIDをテキストボックスに流し込む --- */
let auto_type_ids = () => {
	let ids = window.prompt('IDのリストを入力(最大10件)', '');
	document.getElementById('candidate_input').value = ids;
};

/* --- 候補に追加 --- */
let auto_search = () => {
	let button = document.querySelector('a[title="候補に追加する"]');
	button.dispatchEvent(new Event('click', {bubbles: true, composed: true}));
};
