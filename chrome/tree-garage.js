/* --- [ニコニコ・ブックマーク]投稿画面にボタンを追加 --- */
const addButtonBookmark = records => {
	/* 親を探す */
	const input        = document.getElementById('commonsContentIdInput');
	const exist_button = document.getElementById('ista-open-sidebar');
	if (!input || exist_button) return;
	const frame = input.parentNode.parentNode.parentNode;
	/* ボタンを生成 */
	const button     = document.createElement('button');
	button.innerText = '[拡張機能] ニコニコ・ブックマーク';
	button.id        = 'ista-open-sidebar';
	button.classList.add('ista-button-garage', 'MuiButtonBase-root', 'MuiButton-root', 'MuiButton-text');
	frame.appendChild(button);
};
const root     = document.getElementById('root');
const observer = new MutationObserver(addButtonBookmark);
observer.observe(root, {
	childList : true,
	subtree   : true
});