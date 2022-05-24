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
	/* [サイドバー] サイドバーを生成 */
	generateSidebar(event => {
		const i            = String(document.getElementById('ista-sidebar-title').getAttribute('current-index'));
		const current_area = document.getElementById('commonsContentIdInput');
		let works          = [...document.getElementById('ista-sidebar-list-'+String(i)).children].filter(elem => !elem.classList.contains('added'));
		works              = works.map(elem => {
			elem.classList.add('added');
			return elem.getAttribute('work-id');
		});
		addQueue(works);
	});
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


/* --- [サイドバー] サイドバーを開く --- */
const openSidebarBookmarks = () => {
	/* ブックマーク内の作品一覧を取得 */
	browser.runtime.sendMessage({request:'get-bookmarks'}, response => {
		const current_text = document.getElementById('commonsContentIdInput');
		openSidebar('ニコニコ・ブックマーク', current_text, response, event => {
			const id        = event.currentTarget.getAttribute('work-id');
			const area_list = document.getElementById('commonsContentIdInput');
			addQueue([id]);
			event.currentTarget.classList.add('added');
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
		navigator.clipboard.readText().then(text => {
			const ids = queue[queue.length-1];
			if (text === ' '+optimizeList(ids.join(' '))) {
				document.execCommand('paste');
				queue.pop();
			}
			if (queue.length > 0) setTimeout(addIdsToList, 0);
		});
	}, 0);
};
