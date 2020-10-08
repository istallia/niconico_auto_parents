/*
 * Step01 入力されたIDリストをフォームに自動入力し「候補に追加」する
 */

/* --- ボタンを押すと開始する --- */
document.addEventListener('DOMContentLoaded', () => {
	if( location.href.slice(0,37) === 'http://commons.nicovideo.jp/tree/edit' ) {
		/* 実行のためのボタンを追加 */
		let button = document.createElement('button');
		button.addEventListener('click', () => {
			auto_switch_mode();
			auto_type_ids();
			auto_search();
		});
		let parent = document.getElementsByClassName('search-parent')[0];
		let head   = parent.firstElementChild;
		head.parentNode.insertBefore(button, head.nextSibling);
	}
});

/* --- 「IDから指定」に切り替え --- */
let auto_switch_mode = () => {
	let select = document.getElementById('site_selector');
	select.options[select.options.length-1].selected = true;
};

/* --- 入力されたIDをテキストボックスに流し込む --- */
let auto_type_ids = () => {};

/* --- 候補に追加 --- */
let auto_search = () => {};
