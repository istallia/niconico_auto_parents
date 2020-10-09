/*
 * ページに作用するJavaScript
 * ボタンやモーダルウィンドウの追加、および動作の記述を行う
 */

/* --- ページに要素を追加する --- */
/* ボタンの追加 */
let button_open = document.createElement('a');
button_open.classList.add('btn-01');
button_open.innerText    = '[拡張機能]IDリストから自動登録';
button_open.style.cursor = 'pointer';
button_open.addEventListener('click', () => {
	document.getElementById('ista-auto-modal').style.display    = 'block';
	document.getElementById('ista-auto-modal-bg').style.display = 'block';
});
let parent_button = document.getElementsByClassName('submit')[0];
parent_button.insertBefore(button_open, parent_button.firstChild);
/* モーダルウィンドウの追加 */
let modal_win = document.createElement('div');
modal_win.id = 'ista-auto-modal';
modal_win.classList.add('ista-auto-modal');
modal_win.innerHTML = `
<p>
	使用したモノのIDのリストを入力してください。<br>
	なお、IDのリストは10件ごとに改行されている必要があります。<br>
</p>
<textarea id="ista-auto-list" rows="8"></textarea>
<button onclick="">自動登録</button>
`;
parent_button.parentNode.insertBefore(modal_win, parent_button);
/* モーダル背景の追加 */
let modal_win_bg = document.createElement('div');
modal_win_bg.id  = 'ista-auto-modal-bg';
modal_win_bg.classList.add('ista-auto-modal-bg');
parent_button.parentNode.insertBefore(modal_win_bg, parent_button);
