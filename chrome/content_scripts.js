/*
 * ページに作用するJavaScript
 * ボタンやモーダルウィンドウの追加、および動作の記述を行う
 */

/* --- 状態を保存する --- */
const MAX_WORKS     = 300;
let ista_processing = false;

/* --- IDリストを最高効率に変換する --- */
let optimize_list = (id_list, check_parents = true) => {
	/* IDを1つずつバラバラの配列にする */
	let p_list = id_list.split('\n');
	for (i in p_list) p_list[i] = p_list[i].split(' ');
	p_list = p_list.flat();
	/* 既に登録済みのリストを取得する */
	let ng_list = [];
	let items   = [... document.getElementById('parents').children];
	if (!check_parents) items = [];
	for (item of items) ng_list.push(item.id);
	/* IDの形式であり、かつ重複のないリストを作成する */
	let ok_list = [];
	for (i in p_list) {
		if( /^[a-zA-Z]{1,3}\d{1,12}$/.test(p_list[i]) && ok_list.indexOf(p_list[i]) < 0 && ng_list.indexOf(p_list[i]) < 0 ) {
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
	for (i in res_list) {
		res_list[i] = res_list[i].slice(0, -1);
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
				let p_items      = [... parent_works.children];
				if( items.length + p_items.length > MAX_WORKS ) {
					alert('合計親作品数が300件を超えるため、候補を自動登録することができません。');
					document.getElementById('ista-auto-modal').style.display    = 'none';
					document.getElementById('ista-auto-modal-bg').style.display = 'none';
					document.getElementById('ista-auto-list').value             = '';
					document.getElementById('checkbox').style.display           = 'none';
					document.getElementById('parents').style.backgroundImage    = 'url("")';
					ista_processing                                             = false;
					throw new Error('limit-300');
					return;
				}
				if( items.length < 1 && count < 25 ) {
					setTimeout(add_candidates.bind(this, count+1), 200);
					return;
				}
				items.forEach(item => {
					parent_works.appendChild(item);
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
	id_list          = optimize_list(id_list);
	document.getElementById('ista-auto-list').value = id_list.join('\n');
	localStorage.setItem('ista-verify-contents', String(document.getElementById('ista-verify-contents').checked));
	// let promise_list = [];
	let a_promise = Promise.resolve();
	for (const list of id_list) {
		// promise_list.push(create_promise_candidates.bind(this, list));
		if( list.length > 2 ) a_promise = a_promise.then(create_promise_candidates.bind(this, list));
	}
	// let a_promise = promise_list.reduce((promise, task) => (
	// 	promise.then(task)
	// ), Promise.resolve());
	a_promise.finally(() => {
		let remained_list = optimize_list(document.getElementById('ista-auto-list').value).join('\n');
		let verify        = (localStorage.getItem('ista-verify-contents') !== 'false');
		if ( remained_list.length > 2 && verify ) {
			/* IDが残留した場合 */
			alert('[コンテンツツリー登録支援ツール]\nいくつかのIDの作品が正常に登録されませんでした。\n繰り返し登録しようとしても失敗する場合は、当該作品が非公開または削除された可能性があります。');
			document.getElementById('ista-auto-list').value = remained_list;
			ista_processing = false;
		} else {
			/* すべてのIDが正常に登録された場合 */
			document.getElementById('ista-auto-modal').style.display    = 'none';
			document.getElementById('ista-auto-modal-bg').style.display = 'none';
			document.getElementById('ista-auto-list').value             = '';
			document.getElementById('checkbox').style.display           = 'none';
			document.getElementById('parents').style.backgroundImage    = 'url("")';
			ista_processing                                             = false;
		}
	});
};

/* --- 現在の候補から一括登録を行う --- */
let auto_reg_candidates = () => {
	let candidates   = document.getElementById('candidate');
	let parent_works = document.getElementById('parents');
	let items        = [... candidates.children];
	let p_items      = [... document.getElementById('parents').children];
	if( items.length + p_items.length > MAX_WORKS ) {
		alert('合計親作品数が300件を超えるため、候補を一括登録することができません。');
		return;
	}
	items.forEach(item => {
		for(p_item of p_items) {
			if(p_item.id === item.id) return;
		}
		parent_works.appendChild(item);
	});
	if ( p_items.length === 0 && items.length > 0 ) {
		document.getElementById('checkbox').style.display           = 'none';
		document.getElementById('parents').style.backgroundImage    = 'url("")';
	}
};

/* --- ページに要素を追加する --- */
/* 「IDリストから自動登録」ボタンの追加 */
let button_open = document.createElement('a');
button_open.classList.add('btn-01');
button_open.innerText    = '[拡張機能]IDリストから自動登録';
button_open.style.cursor = 'pointer';
button_open.addEventListener('click', () => {
	document.getElementById('ista-auto-modal').style.display    = 'block';
	document.getElementById('ista-auto-modal-bg').style.display = 'block';
	document.getElementById('ista-auto-modal').ondragover = event => {
		event.preventDefault();
		document.getElementById('ista-auto-list').classList.add('ista-dragover');
	};
	document.getElementById('ista-auto-modal').ondragleave = event => {
		document.getElementById('ista-auto-list').classList.remove('ista-dragover');
	};
	document.getElementById('ista-auto-modal').ondrop = event => {
		document.getElementById('ista-auto-list').classList.remove('ista-dragover');
		if (event.dataTransfer.files.length <= 0) return;
		event.preventDefault();
		for (let file of event.dataTransfer.files) {
			const reader = new FileReader();
			reader.addEventListener('load', event => {
				const regexp       = /(?<=^|[^a-zA-Z0-9])((nc|im|sm|td)\d{2,12})(?=[^a-zA-Z0-9]|$)/g;
				const dropped_text = event.currentTarget.result.replace(/\x00/g, '');
				const dropped_ids  = [... dropped_text.matchAll(regexp)];
				for (let index in dropped_ids) dropped_ids[index] = dropped_ids[index][1];
				let text_list = document.getElementById('ista-auto-list').value;
				if (text_list.slice(-1) !== '\n' && text_list.length > 0) text_list = text_list + '\n';
				text_list = text_list + optimize_list(dropped_ids.join(' '),false).join('\n');
				document.getElementById('ista-auto-list').value = text_list;
			});
			reader.readAsText(file);
		}
	};
	document.getElementById('ista-auto-button').onclick = add_materials;
	let select           = document.getElementById('site_selector');
	select.selectedIndex = select.options.length - 1;
	select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
	/* チェックボックスに値を反映する */
	document.getElementById('ista-verify-contents').checked = (localStorage.getItem('ista-verify-contents') !== 'false');
});
let parent_button = document.getElementsByClassName('submit')[0];
parent_button.insertBefore(button_open, parent_button.firstChild);
/* モーダルウィンドウの追加 */
let modal_win = document.createElement('div');
modal_win.id = 'ista-auto-modal';
modal_win.classList.add('ista-auto-modal');
modal_win.innerHTML = `
<p>
	使用した素材のIDのリストを入力してください。<br>
	[v0.1.1] IDのリストの整理は自動で行います。1行が10件未満、または超過でも10件ごとに整頓します。<br>
	[v0.3.0] ファイル(複数可)をここにドラッグ＆ドロップするとID(動画/静画/コモンズ/立体)を抽出してテキストエリアに追加します。<br>
	<label for="ista-verify-contents"><input type="checkbox" id="ista-verify-contents" checked>&nbsp;書き込み検証を行う</label>
</p>
<textarea id="ista-auto-list"></textarea>
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
/* 「一括登録」ボタンの追加 */
let button_reg = document.createElement('button');
button_reg.classList.add('ista-button-reg');
button_reg.innerText = '[拡張機能]一括登録';
button_reg.title     = '親候補作品を一括で親作品に移動'
button_reg.addEventListener('click', auto_reg_candidates);
let parent_h3 = document.querySelector('div.search-parent h3');
parent_h3.appendChild(button_reg);

/* --- 候補作品をクリックで移動させるためのイベント --- */
let click_to_reg = event => {
	/* 親をチェック */
	const parent = event.currentTarget.parentNode;
	if( parent.id !== 'candidate' ) return;
	/* 親作品の件数チェック */
	let p_items = [... document.getElementById('parents').children];
	if( p_items.length + 1 > MAX_WORKS ) {
		alert('300件を超える親作品を登録することはできません。');
		return;
	}
	/* 移動する */
	const parent_works = document.getElementById('parents');
	parent_works.appendChild(event.currentTarget);
	if ( p_items.length === 0 ) {
		document.getElementById('checkbox').style.display           = 'none';
		document.getElementById('parents').style.backgroundImage    = 'url("")';
	}
};
let observer_candidates = () => {
	let parent_items = [... document.getElementById('candidate').children];
	parent_items.forEach(item => {
		if( item.getAttribute('ev') !== 'yes' ) {
			item.addEventListener('click', click_to_reg);
			item.setAttribute('ev', 'yes');
		}
	});
};
setInterval(observer_candidates, 200);
