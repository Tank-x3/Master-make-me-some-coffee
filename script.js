// --- グローバル変数と定数 ---
const SPECIAL_EFFECT_KEYWORD = "特殊効果つき";
let menuData = {}; 

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // ★★★ ダークモードの初期化処理を追加 ★★★
    const themeToggle = document.getElementById('theme-toggle');
    
    // 1. 保存された設定を読み込む
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }

    // 2. スイッチのイベントリスナーを設定
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });

    // メニューデータの読み込み
    fetch('menu_data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            menuData = data;
            initializeUI();
        })
        .catch(error => {
            console.error('menu_data.jsonの読み込みに失敗しました:', error);
            const resultTextarea = document.getElementById('result-text');
            const errorMessage = "おおっと……メニューデータが読み込めねぇな。ローカルサーバー環境になってない？あ、違う……？";
            resultTextarea.value = errorMessage;
            alert(errorMessage);
        });
});

function initializeUI() {
    const genreSelector = document.getElementById('genre-selector');
    const genres = Object.keys(menuData).filter(key => key !== "特殊効果");
    genres.forEach((genre, index) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'genre';
        radio.value = genre;
        if (index === 0) radio.checked = true;
        radio.addEventListener('click', (e) => e.target.focus());
        label.appendChild(radio);
        label.appendChild(document.createTextNode(genre));
        genreSelector.appendChild(label);
    });
    document.getElementById('generate-button').addEventListener('click', generateAndDisplayResult);
    document.getElementById('copy-button').addEventListener('click', () => copyToClipboard(false));
}

function generateAndDisplayResult() {
    if (Object.keys(menuData).length === 0) {
        alert("メニューデータがまだ読み込まれていません。");
        return;
    }
    const shouldReset = document.getElementById('reset-checkbox').checked;
    const shouldAutoCopy = document.getElementById('autocopy-checkbox').checked;
    const selectedGenre = document.querySelector('input[name="genre"]:checked').value;
    const diceInputs = [
        document.getElementById('dice1').value,
        document.getElementById('dice2').value,
        document.getElementById('dice3').value
    ];
    if (diceInputs.some(val => val === '')) {
        alert("＼ダイス目を3つ全て入力するんだねー！！ﾏﾛﾏﾛﾏﾛﾏﾛ……／");
        if (shouldReset) clearDiceEntries();
        return;
    }
    const diceResults = [];
    for (const val of diceInputs) {
        const num = parseInt(val, 10);
        if (isNaN(num)) {
            alert("あ、ああ、あ、あ、あああのっ！！だ、だだ、ダイス目は……は、は、半角数字を……つ、つつ、つかって、ほしい……か、かな………あ、ああ、ご、ごめんね？");
            if (shouldReset) clearDiceEntries();
            return;
        }
        diceResults.push(num);
    }
    const result = generateMenu(selectedGenre, diceResults);
    const resultTextarea = document.getElementById('result-text');
    if (result.startsWith("エラー:")) {
        alert(result.replace(/^エラー: /, ""));
        resultTextarea.value = "";
    } else {
        resultTextarea.value = result;
        if (shouldAutoCopy) {
            copyToClipboard(true);
        }
    }
    if (shouldReset) clearDiceEntries();
}

function generateMenu(genre, diceResults) {
    const rules = menuData[genre];
    if (!rules) return `エラー: 指定されたジャンル '${genre}' は存在しません。`;
    const { dice_type, parts, リスト } = rules;
    if (diceResults.length !== parts.length) return `エラー: ${genre}では${parts.length}個のダイス目が必要です。`;
    for (const d of diceResults) {
        if (!(1 <= d && d <= dice_type)) {
            let message = "ははは、バカめ………このダイスは（面数）面体ダイスを使うんだよ……出直してきな……";
            return `エラー: ${message.replace("（面数）", dice_type).replace("（出目）", d)}`;
        }
    }
    try {
        const menuParts = parts.map((key, i) => リスト[key][diceResults[i] - 1]);
        const fullMenuName = menuParts.join(" ");
        if (menuParts[0] === SPECIAL_EFFECT_KEYWORD) {
            const specialRules = menuData["特殊効果"];
            if (!specialRules) return `「${fullMenuName}」`;
            let output = `「${fullMenuName}」\n\n`;
            output += `dice1d${specialRules.dice_type}=\n`;
            output += specialRules.リスト.map((effect, i) => `${i + 1}　${effect}`).join("\n");
            return output;
        }
        return `「${fullMenuName}」`;
    } catch (e) {
        console.error(e);
        return "エラー: ……………おいおい、これぶっ壊れてねぇかぁ？対応してるメニューねぇぞ？";
    }
}

function copyToClipboard(isAuto = false) {
    const resultTextarea = document.getElementById('result-text');
    const content = resultTextarea.value;
    if (!content) {
        if (!isAuto) alert("コピーする内容がありません。");
        return;
    }
    navigator.clipboard.writeText(content).then(() => {
        const copyButton = document.getElementById('copy-button');
        const originalText = copyButton.textContent;
        copyButton.textContent = 'コピー完了！';
        setTimeout(() => { copyButton.textContent = originalText; }, 2000);
        if (!isAuto) alert("結果をクリップボードにコピーしました。");
    }, (err) => {
        if (!isAuto) alert("コピーに失敗しました。");
        console.error('コピー失敗:', err);
    });
}

function clearDiceEntries() {
    const diceInputs = [document.getElementById('dice1'), document.getElementById('dice2'), document.getElementById('dice3')];
    diceInputs.forEach(input => input.value = '');
    diceInputs[0].focus();
}
