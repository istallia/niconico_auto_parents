/*
 * ページに作用するJavaScript
 * ボタンやモーダルウィンドウの追加、および動作の記述を行う
 */

/* --- 状態を保存する --- */
let ista_processing = false;

/* --- IDリストを最高効率に変換する --- */
let optimize_list = id_list => {
	/* IDを1つずつバラバラの配列にする */
	let p_list = id_list.split('\n');
	for (i in p_list) p_list[i] = p_list[i].split();
	p_list.flat();
	/* IDの形式であり、かつ重複のないリストを作成する */
	let ok_list = [];
	for (i in p_list) {
		if( /^[a-zA-Z]{1,3}\d{1,12}$/.test(p_list[i]) && ok_list.indexOf(p_list[i]) < 0 ) {
			ok_list.push(p_list[i]);
		}
	}
	/* 10件ごとのリストに変換する */
	let res_list = [];
	for (i in ok_list) {
		i = Number(i);
		if( i % 10 === 0 ) res_list.push('');
		res_list[Math.floor(i/10)] += ok_list[i];
		if( i % 10 < 9 ) {
			res_list[Math.floor(i/10)] += ' ';
		} else {
			res_list[Math.floor(i/10)] += '\n';
		}
	}
	return res_list;
};

/* --- 入力→候補に追加→要素の移動 を行うPromiseを返す --- */
let create_promise_candidates = id10 => {
	return new Promise(resolve => {
		/* 入力 */
		return new Promise(() => {
			// console.log(id10);
			document.getElementById('candidate_input').value = id10;
			resolve();
		});
	})
	.then(() => {
		/* 候補に追加 */
		return new Promise(resolve => {
			let button = document.querySelector('a[title="候補に追加する"]');
			button.dispatchEvent(new Event('click', {bubbles: true, composed: true}));
			// console.log('[拡張機能]候補に追加');
			setTimeout(() => {
				document.getElementById('candidate_input').value = '';
			}, 200);
			resolve();
		});
	})
	.then(() => {
		/* 要素の移動 */
		return new Promise(resolve => {
			let add_candidates = count => {
				let candidates   = document.getElementById('candidate');
				let parent_works = document.getElementById('parents');
				let items        = [... candidates.children];
				if( items.length < 1 && count < 10 ) {
					setTimeout(add_candidates.bind(this, count+1), 200);
					return;
				}
				items.forEach(item => {
					parents.appendChild(item);
				});
				// console.log('[拡張機能]要素の移動');
				resolve();
			};
			setTimeout(add_candidates.bind(this, 0), 300);
		});
	});
};

/* --- IDリストを読み取り、すべてのIDを追加する --- */
let add_materials = () => {
	ista_processing  = true;
	let id_list      = document.getElementById('ista-auto-list').value;
	id_list          = id_list.split('\n');
	// let promise_list = [];
	let a_promise    = Promise.resolve();
	for (const list of id_list) {
		// promise_list.push(create_promise_candidates.bind(this, list));
		if( list.length > 2 ) a_promise = a_promise.then(create_promise_candidates.bind(this, list));
	}
	// let a_promise = promise_list.reduce((promise, task) => (
	// 	promise.then(task)
	// ), Promise.resolve());
	a_promise.then(() => {
		document.getElementById('ista-auto-modal').style.display    = 'none';
		document.getElementById('ista-auto-modal-bg').style.display = 'none';
		document.getElementById('ista-auto-list').value             = '';
		document.getElementById('checkbox').style.display           = 'none';
		document.getElementById('parents').style.backgroundImage    = 'url("")';
		ista_processing                                             = false;
	});
};

/* --- ページに要素を追加する --- */
/* ボタンの追加 */
let button_open = document.createElement('a');
button_open.classList.add('btn-01');
button_open.innerText    = '[拡張機能]IDリストから自動登録';
button_open.style.cursor = 'pointer';
button_open.addEventListener('click', () => {
	document.getElementById('ista-auto-modal').style.display    = 'block';
	document.getElementById('ista-auto-modal-bg').style.display = 'block';
	document.getElementById('ista-auto-button').onclick         = add_materials;
	let select           = document.getElementById('site_selector');
	select.selectedIndex = select.options.length - 1;
	select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
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
<button id="ista-auto-button">自動登録</button>
`;
parent_button.parentNode.insertBefore(modal_win, parent_button);
/* モーダル背景の追加 */
let modal_win_bg = document.createElement('div');
modal_win_bg.id  = 'ista-auto-modal-bg';
modal_win_bg.classList.add('ista-auto-modal-bg');
parent_button.parentNode.insertBefore(modal_win_bg, parent_button);
modal_win_bg.addEventListener('click', () => {
	if( !ista_processing ) {
		document.getElementById('ista-auto-modal').style.display    = 'none';
		document.getElementById('ista-auto-modal-bg').style.display = 'none';
	}
});
