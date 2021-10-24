/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 広域変数 --- */
const queue = [];


/* --- フォームはオプションを開いたときのみ現れる --- */
const addButtonBookmark = records => {
	/* 親を探す */
	const input        = document.getElementById('commonsContentIdInput');
	const exist_button = document.getElementById('ista-open-sidebar');
	if (!input || exist_button) return;
	const frame = input.parentNode.parentNode.parentNode;
	/* [ニコニコ・ブックマーク] ボタンを生成 */
	const button     = document.createElement('button');
	button.innerText = '[拡張機能] ニコニコ・ブックマーク';
	button.id        = 'ista-open-sidebar';
	button.classList.add('ista-button-garage', 'MuiButtonBase-root', 'MuiButton-root', 'MuiButton-text');
	frame.appendChild(button);
	/* [ニコニコ・ブックマーク] サイドバーを生成 */
	generateSidebarBookmarks();
	button.addEventListener('click', openSidebarBookmarks);
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
};
const root     = document.getElementById('root');
const observer = new MutationObserver(addButtonBookmark);
observer.observe(root, {
	childList : true,
	subtree   : true
});


/* --- [ニコニコ・ブックマーク] サイドバーを準備する --- */
const generateSidebarBookmarks = () => {
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
	title.innerText = 'ニコニコ・ブックマーク';
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
		document.getElementById('ista-sidebar-bookmarks-title').innerText = 'ニコニコ・ブックマーク';
		document.getElementById('ista-sidebar-bookmarks-folders').classList.add('visible');
	});
	button_add_all.addEventListener('click', event => {
		const i            = String(document.getElementById('ista-sidebar-bookmarks-title').getAttribute('current-index'));
		const current_area = document.getElementById('commonsContentIdInput');
		let works          = [...document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).children].filter(elem => !elem.classList.contains('added'));
		works              = works.map(elem => {
			elem.classList.add('added');
			return elem.getAttribute('work-id');
		});
		addQueue(works);
	});
	area_buttons.appendChild(button_back);
	area_buttons.appendChild(button_add_all);
	div.appendChild(area_buttons);
	/* フォルダ一覧の箱を作成 */
	let folders = document.createElement('div');
	folders.id  = 'ista-sidebar-bookmarks-folders';
	folders.classList.add('ista-sidebar-list', 'folders', 'visible');
	div.appendChild(folders);
};


/* --- [ニコニコ・ブックマーク] サイドバーを開く --- */
const openSidebarBookmarks = () => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar-bookmarks')){
		return;
	} else if (document.getElementById('ista-sidebar-bookmarks').classList.contains('visible')) {
		closeSidebarBookmarks();
		return;
	}
	let div_lists = [...document.getElementsByClassName('ista-sidebar-list')].filter(div => !div.classList.contains('folders'));
	div_lists.forEach(div => div.remove());
	[...document.getElementById('ista-sidebar-bookmarks-folders').children].forEach(div => div.remove());
	/* ブックマーク内の作品一覧を取得 */
	browser.runtime.sendMessage({request:'get-bookmarks'}, response => {
		if (response.length > 0) {
			/* フォルダ→作品一覧のイベント作成 */
			const openSidebarWorks = event => {
				const i            = event.currentTarget.getAttribute('folder-index');
				const current_text = document.getElementById('commonsContentIdInput').value;
				document.getElementById('ista-sidebar-bookmarks-title').setAttribute('current-index', String(i));
				document.getElementById('ista-sidebar-bookmarks-title').innerText = event.currentTarget.innerText;
				document.getElementById('ista-sidebar-bookmarks-folders').classList.remove('visible');
				document.getElementById('ista-sidebar-bookmarks-buttons').classList.add('visible');
				[...document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).children].forEach(elem => {
					if (current_text.indexOf(elem.getAttribute('work-id')) > -1) {
						elem.classList.add('added');
					} else {
						elem.classList.remove('added');
					}
				});
				document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).classList.add('visible');
			};
			/* 作品クリックでIDを追加するイベントハンドラ */
			const addWorkFromBookmarks = event => {
				const id           = event.currentTarget.getAttribute('work-id');
				const area_list    = document.getElementById('commonsContentIdInput');
				addQueue([id]);
				event.currentTarget.classList.add('added');
			};
			/* 作品一覧を生成 */
			response.forEach((element, index) => {
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
				element.works.forEach(data => {
					let work       = document.createElement('div');
					work.innerText = data.name + '\n(' + data.id + ')';
					work.setAttribute('work-id', data.id);
					work.addEventListener('click', addWorkFromBookmarks);
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
		document.getElementById('ista-sidebar-bookmarks-title').innerText = 'ニコニコ・ブックマーク';
		document.getElementById('ista-sidebar-bookmarks-buttons').classList.remove('visible');
		document.getElementById('ista-sidebar-bookmarks').classList.add('visible');
		document.getElementById('ista-sidebar-bookmarks-folders').classList.add('visible');
	});
};


/* --- [ニコニコ・ブックマーク] サイドバーを閉じる --- */
const closeSidebarBookmarks = () => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar-bookmarks')) return;
	/* サイドバーのベースを表示する */
	document.getElementById('ista-sidebar-bookmarks').classList.remove('visible');
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
		addQueue(dropped_ids);
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
const addQueue = ids => {
	queue.unshift(ids);
	if (queue.length === 1) addIdsToList();
};


/* --- IDリストをhtmlのリストに追加 --- */
const addIdsToList = () => {
	/* IDリストをコピー */
	const ids = queue[queue.length-1];
	navigator.clipboard.writeText(' '+optimizeList(ids.join(' ')));
	/* ちょっと後にペースト */
	setTimeout(() => {
		const input = document.getElementById('commonsContentIdInput');
		input.focus();
		document.execCommand('paste');
		const used_ids = queue.pop();
		if (queue.length > 0) setTimeout(addIdsToList, 0);
	}, 0);
};
