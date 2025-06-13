/**
 * @fileoverview 組織図表示アプリケーション
 * CSVファイルから組織構造を読み込み、階層表示する
 */

// @ts-check

/**
 * @typedef {Object} Member - 職員情報
 * @property {string} name - 氏名
 * @property {string} number - 職員番号
 * @property {string} positionCode - 役職コード
 * @property {string} position - 役職名
 * @property {string} [orgCode] - 所属組織コード
 * @property {string} [orgName] - 所属組織名
 * @property {number} [level] - 組織階層レベル
 */

/**
 * @typedef {Object} OrgNode - 組織ノード
 * @property {string} code - 組織コード
 * @property {string} name - 組織名
 * @property {number} level - 階層レベル
 * @property {Member[]} members - 直属メンバー
 * @property {Object<string, number>} memberCounts - 役職別人数
 * @property {number} totalMembers - 総人数（子組織含む）
 * @property {Object<string, OrgNode>} [children] - 子組織
 */

/**
 * @typedef {Object} OrgLevel - 組織階層情報
 * @property {number} codeIdx - 組織コード列インデックス
 * @property {number} nameIdx - 組織名列インデックス
 */

// =============================================================================
// グローバル変数
// =============================================================================

/** @type {OrgNode|null} 現在のツリーデータ */
let currentTreeData = null;

/** @type {OrgLevel[]|null} 現在の組織階層情報 */
let currentOrgLevels = null;

/** @type {number} リーダーハイライト閾値（役職コード） */
let leaderThreshold = 100;

/**
 * @typedef {Object} SearchResult - 検索結果
 * @property {'org'|'member'} type - 検索結果の種類
 * @property {string[]} orgPath - 組織パス
 * @property {string} orgName - 組織名
 * @property {string} orgCode - 組織コード
 * @property {Member} [member] - メンバー情報（メンバー検索の場合）
 * @property {OrgNode} node - 組織ノード
 * @property {number} [matchScore] - マッチスコア
 * @property {string} [matchText] - マッチしたテキスト
 */

/** @type {SearchResult[]} 検索インデックス */
let searchIndex = [];

/** @type {number} 選択中の検索結果インデックス */
let selectedSearchIndex = -1;

// =============================================================================
// CSVパース機能
// =============================================================================

/**
 * CSVテキストをパースして行データに変換
 * @param {string} csv - CSVテキスト
 * @returns {{headers: string[], data: string[][]}} パース結果
 */
function parseCSV(csv) {
  const rows = csv.trim().split('\n').map(r => r.split(',').map(cell => cell.trim()));
  const headers = rows[0];
  const data = rows.slice(1);
  return { headers, data };
}

// =============================================================================
// 組織階層解析機能
// =============================================================================

/**
 * ヘッダー行から組織階層情報を抽出
 * @param {string[]} headers - CSVヘッダー行
 * @returns {OrgLevel[]} 組織階層情報の配列
 */
function getOrgLevels(headers) {
  const nameIdx = headers.indexOf('氏名');
  const numberIdx = headers.indexOf('職員番号');
  const orgLevels = [];
  
  // 職員番号列が見つかった場合は、その前まで、見つからない場合は氏名列の前まで
  const endIdx = numberIdx !== -1 ? numberIdx : nameIdx;
  
  for (let i = 0; i < endIdx; i += 2) {
    // 次の列も存在することを確認
    if (i + 1 < endIdx) {
      orgLevels.push({ codeIdx: i, nameIdx: i + 1 });
    }
  }
  return orgLevels;
}

// =============================================================================
// ツリー構造構築機能
// =============================================================================

/**
 * CSVデータから組織ツリー構造を構築
 * @param {string[][]} data - CSVデータ行
 * @param {OrgLevel[]} orgLevels - 組織階層情報
 * @param {number} nameIdx - 氏名列インデックス
 * @param {number} numberIdx - 職員番号列インデックス
 * @param {number} positionCodeIdx - 役職コード列インデックス
 * @param {number} positionIdx - 役職列インデックス
 * @returns {Object} ツリー構造のルートノード
 */
function buildTree(data, orgLevels, nameIdx, numberIdx, positionCodeIdx, positionIdx) {
  const tree = {};
  data.forEach((row, index) => {
    const orgPath = orgLevels.map(lv => ({
      code: row[lv.codeIdx] || '',
      name: row[lv.nameIdx] || ''
    }));
    const member = {
      name: row[nameIdx] || '',
      number: row[numberIdx] || '',
      positionCode: row[positionCodeIdx] || '',
      position: row[positionIdx] || ''
    };
    
    // 最初の数行をデバッグ出力
    if (index < 3) {
      console.log(`Row ${index}:`, row);
      console.log(`OrgPath:`, orgPath);
      console.log(`Member:`, member);
    }
    
    addToTree(tree, orgPath, member);
  });
  return tree;
}

/**
 * ツリーに組織パスとメンバーを追加
 * @param {Object} tree - ツリーのルート
 * @param {Array<{code: string, name: string}>} path - 組織パス
 * @param {Member} member - 追加するメンバー
 */
function addToTree(tree, path, member) {
  let node = tree;
  let targetOrg = null;
  
  // 組織階層を構築し、メンバーが所属する最も具体的な組織を特定
  for (let i = 0; i < path.length; i++) {
    const { code, name } = path[i];
    if (!code || !name) break; // 組織コードまたは組織名のどちらかが空の場合はそこで終了
    
    if (!node.children) node.children = {};
    const key = `${code}:${name}`;
    if (!node.children[key]) {
      node.children[key] = { 
        code, 
        name,
        level: i, // 階層レベルを保存（0: 部, 1: 課, 2: 係）
        members: [],
        memberCounts: {}, // 役職別人数カウント
        totalMembers: 0 // 総人数（子組織含む）
      };
    }
    node = node.children[key];
    targetOrg = node;
  }
  
  // メンバーを適切な組織に配置（最も具体的な有効な組織に配置）
  if (targetOrg) {
    if (!targetOrg.members) targetOrg.members = [];
    if (!targetOrg.memberCounts) targetOrg.memberCounts = {};
    
    member.orgCode = targetOrg.code;
    member.orgName = targetOrg.name;
    member.level = targetOrg.level;
    targetOrg.members.push(member);
    
    // 役職別人数をカウント
    const position = member.position || '不明';
    targetOrg.memberCounts[position] = (targetOrg.memberCounts[position] || 0) + 1;
  }
}

/**
 * 各ノードの総人数を計算（子組織含む）
 * @param {OrgNode} node - 計算対象のノード
 * @returns {number} 総人数
 */
function calculateTotalMembers(node) {
  let total = node.members ? node.members.length : 0;
  if (node.children) {
    for (const key of Object.keys(node.children)) {
      total += calculateTotalMembers(node.children[key]);
    }
  }
  node.totalMembers = total;
  return total;
}

// =============================================================================
// HTML生成・レンダリング機能
// =============================================================================

/**
 * ツリー構造をHTMLに変換
 * @param {OrgNode} node - レンダリングするノード
 * @param {number} level - 階層レベル
 * @returns {string} 生成されたHTML
 */
function renderTree(node, level = 0) {
  let html = '';
  
  if (node.name) {
    // 組織名と統計情報の表示
    const statsHtml = generateStatsHtml(node);
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const hasMembers = node.members && node.members.length > 0;
    const hasContent = hasChildren || hasMembers;
    const nodeId = `org-${node.code}-${Math.random().toString(36).substr(2, 9)}`;
    
    html += `<li class="org-node level-${level}">
      <div class="org-header" ${hasContent ? `onclick="toggleSection('${nodeId}')"` : ''}>
        ${hasContent ? `<i class="fas fa-chevron-down toggle-icon" id="icon-${nodeId}"></i>` : '<i class="fas fa-circle org-bullet"></i>'}
        <strong class="org-name">${escapeHTML(node.name)} <span class="org-code">[${escapeHTML(node.code)}]</span></strong>
        ${statsHtml}
      </div>`;
      // 直属メンバーの表示（役職コード昇順 → 職員番号昇順）
    if (node.members && node.members.length > 0) {
      const sortedMembers = sortMembersByPositionCode(node.members);
      
      html += `<ul class="members-list" id="members-${nodeId}">`;
      sortedMembers.forEach(m => {
        // 役職コード基準でハイライト判定（小さい数値ほどリーダー）
        const positionCodeNum = parseInt(m.positionCode) || 9999;
        const isLeader = positionCodeNum <= leaderThreshold;
        html += `<li class="member ${isLeader ? 'leader' : ''}">${escapeHTML(m.name)}（${escapeHTML(m.position)}/${escapeHTML(m.number)}）</li>`;
      });
      html += '</ul>';
    }
    
    // 子組織の表示（組織コード順）
    if (node.children) {
      const sortedKeys = sortChildrenKeys(node.children);
      
      if (sortedKeys.length > 0) {
        html += `<ul class="children-list" id="children-${nodeId}">`;
        for (const key of sortedKeys) {
          html += renderTree(node.children[key], level + 1);
        }
        html += '</ul>';
      }
    }
    
    html += '</li>';
  } else {
    // ルートノードの場合
    html += '<ul class="tree-root">';
    if (node.children) {
      const sortedKeys = sortChildrenKeys(node.children);
      
      for (const key of sortedKeys) {
        html += renderTree(node.children[key], level);
      }
    }
    html += '</ul>';
  }
  
  return html;
}

/**
 * メンバーを役職コード・職員番号順にソート
 * @param {Member[]} members - ソート対象のメンバー配列
 * @returns {Member[]} ソート済みメンバー配列
 */
function sortMembersByPositionCode(members) {
  return members.slice().sort((a, b) => {
    const codeA = parseInt(a.positionCode) || 9999;
    const codeB = parseInt(b.positionCode) || 9999;
    
    // 役職コードで昇順ソート（小さい方が上位）
    if (codeA !== codeB) {
      return codeA - codeB;
    }
    
    // 役職コードが同じ場合は職員番号で昇順ソート
    const numberA = parseInt(a.number) || 0;
    const numberB = parseInt(b.number) || 0;
    return numberA - numberB;
  });
}

/**
 * 子組織のキーを組織コード順にソート
 * @param {Object<string, OrgNode>} children - 子組織オブジェクト
 * @returns {string[]} ソート済みキー配列
 */
function sortChildrenKeys(children) {
  return Object.keys(children).sort((a, b) => {
    const codeA = children[a].code.padStart(4, '0');
    const codeB = children[b].code.padStart(4, '0');
    return codeA.localeCompare(codeB);
  });
}

/**
 * 統計情報のHTMLを生成
 * @param {OrgNode} node - 統計を生成するノード
 * @returns {string} 統計情報HTML
 */
function generateStatsHtml(node) {
  if (!node.memberCounts || Object.keys(node.memberCounts).length === 0) {
    return '';
  }
  
  // PC向けの横表示判定（画面幅768px以上）
  const directMembers = node.members ? node.members.length : 0;
  const totalMembers = node.totalMembers || 0;
  
  const statsItems = Object.entries(node.memberCounts)
    .sort(([,a], [,b]) => b - a) // 人数の多い順
    .map(([position, count]) => `${escapeHTML(position)}:${count}人`)
    .join(', ');
  
  const memberInfo = totalMembers > directMembers 
    ? `直属:${directMembers}人 総計:${totalMembers}人` 
    : `${directMembers}人`;
  
  return `<span class="org-stats" data-stats="${escapeHTML(statsItems)}">${memberInfo} (${statsItems})</span>`;
}

// =============================================================================
// 検索機能
// =============================================================================

/**
 * 検索インデックスを構築
 * @param {Object} tree - ツリーデータ
 * @param {string[]} parentPath - 親組織のパス
 */
function buildSearchIndex(tree, parentPath = []) {
  searchIndex = [];
  if (tree.children) {
    for (const key of Object.keys(tree.children)) {
      buildSearchIndexRecursive(tree.children[key], parentPath);
    }
  }
}

/**
 * 検索インデックスを再帰的に構築
 * @param {OrgNode} node - 現在のノード
 * @param {string[]} parentPath - 親組織のパス
 */
function buildSearchIndexRecursive(node, parentPath) {
  const currentPath = [...parentPath, node.name];
  
  // 組織を検索インデックスに追加
  searchIndex.push({
    type: 'org',
    orgPath: currentPath,
    orgName: node.name,
    orgCode: node.code,
    node: node
  });
  
  // メンバーを検索インデックスに追加
  if (node.members) {
    node.members.forEach(member => {
      searchIndex.push({
        type: 'member',
        orgPath: currentPath,
        orgName: node.name,
        orgCode: node.code,
        member: member,
        node: node
      });
    });
  }
  
  // 子組織を再帰処理
  if (node.children) {
    for (const key of Object.keys(node.children)) {
      buildSearchIndexRecursive(node.children[key], currentPath);
    }
  }
}

/**
 * 検索を実行
 * @param {string} query - 検索クエリ
 * @returns {SearchResult[]} 検索結果
 */
function performSearch(query) {
  if (!query || query.length < 1) {
    return [];
  }
  
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  searchIndex.forEach(item => {
    let matchScore = 0;
    let matchText = '';
    
    if (item.type === 'org') {
      // 組織名での検索
      if (item.orgName.toLowerCase().includes(lowerQuery)) {
        matchScore = item.orgName.toLowerCase() === lowerQuery ? 100 : 50;
        matchText = item.orgName;
      }
      // 組織コードでの検索
      else if (item.orgCode.toLowerCase().includes(lowerQuery)) {
        matchScore = item.orgCode.toLowerCase() === lowerQuery ? 90 : 40;
        matchText = item.orgCode;
      }    } else if (item.type === 'member' && item.member) {
      // 職員名での検索
      if (item.member.name.toLowerCase().includes(lowerQuery)) {
        matchScore = item.member.name.toLowerCase() === lowerQuery ? 100 : 60;
        matchText = item.member.name;
      }
      // 職員番号での検索
      else if (item.member.number.toLowerCase().includes(lowerQuery)) {
        matchScore = item.member.number.toLowerCase() === lowerQuery ? 95 : 45;
        matchText = item.member.number;
      }
      // 役職での検索
      else if (item.member.position.toLowerCase().includes(lowerQuery)) {
        matchScore = item.member.position.toLowerCase() === lowerQuery ? 80 : 35;
        matchText = item.member.position;
      }
    }
    
    if (matchScore > 0) {
      results.push({
        ...item,
        matchScore,
        matchText
      });
    }
  });
    // マッチスコア順にソート
  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}

/**
 * 検索結果をHTMLに変換
 * @param {SearchResult[]} results - 検索結果
 * @returns {string} 検索結果HTML
 */
function renderSearchResults(results) {
  if (results.length === 0) {
    return '<div class="search-no-results">検索結果が見つかりませんでした</div>';
  }
  
  return results.map((result, index) => {
    const isSelected = index === selectedSearchIndex;
    const pathText = result.orgPath.join(' > ');
    
    if (result.type === 'org') {
      return `
        <div class="search-result-item ${isSelected ? 'selected' : ''}" data-index="${index}" data-type="org">
          <i class="fas fa-building search-result-icon"></i>
          <div class="search-result-content">
            <div class="search-result-name">${escapeHTML(result.orgName)}</div>
            <div class="search-result-path">${escapeHTML(pathText)}</div>
          </div>
        </div>
      `;    } else if (result.member) {
      return `
        <div class="search-result-item search-result-member ${isSelected ? 'selected' : ''}" data-index="${index}" data-type="member">
          <i class="fas fa-user search-result-icon"></i>
          <div class="search-result-content">
            <div class="search-result-name">${escapeHTML(result.member.name)}</div>
            <div class="search-result-path">${escapeHTML(pathText)}</div>
            <div class="search-result-path">${escapeHTML(result.member.position)} • ${escapeHTML(result.member.number)}</div>
          </div>
        </div>
      `;
    }  }).join('');
}

/**
 * 検索結果の選択状態を更新
 * @param {number} index - 選択する検索結果のインデックス
 */
function updateSearchResultSelection(index) {
  const results = document.querySelectorAll('.search-result-item');
  if (index >= 0 && index < results.length) {
    selectedSearchIndex = index;
    results.forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });
  }
}

/**
 * 検索結果をクリックまたは選択した時の処理
 * @param {SearchResult} result - 選択された検索結果
 */
function navigateToSearchResult(result) {
  // 検索UI を非表示
  hideSearchResults();
  
  // 組織ノードまでの展開とスクロール
  expandToNode(result.node);
  
  // 少し遅延してスクロール
  setTimeout(() => {
    const nodeElement = findNodeElement(result.node);
    if (nodeElement) {
      nodeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // ハイライト効果
      nodeElement.classList.add('search-highlight-temp');
      setTimeout(() => {
        nodeElement.classList.remove('search-highlight-temp');
      }, 2000);
    }
  }, 100);
}

/**
 * 検索結果を非表示にする
 */
function hideSearchResults() {
  const searchResults = document.getElementById('searchResults');
  const searchInput = document.getElementById('searchInput');
  
  if (searchResults) {
    searchResults.style.display = 'none';
  }
  if (searchInput instanceof HTMLInputElement) {
    searchInput.value = '';
  }
  selectedSearchIndex = -1;
}

/**
 * 指定されたノードまでの組織を展開
 * @param {OrgNode} targetNode - 展開対象のノード
 */
function expandToNode(targetNode) {
  // この機能は後で実装
  console.log('Expanding to node:', targetNode);
}

/**
 * ノードに対応するDOM要素を見つける
 * @param {OrgNode} node - 検索対象のノード
 * @returns {HTMLElement|null} 対応するDOM要素
 */
function findNodeElement(node) {
  // この機能は後で実装
  return null;
}

/**
 * 検索機能の初期化
 */
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const searchClear = document.getElementById('searchClear');
  
  if (!searchInput || !searchResults || !searchClear) {
    return;
  }
  
  let searchTimeout;
    // インクリメントサーチの実装
  searchInput.addEventListener('input', function(e) {
    const target = /** @type {HTMLInputElement} */(e.target);
    const query = target.value.trim();
    
    // クリアボタンの表示/非表示
    searchClear.style.display = query ? 'flex' : 'none';
    
    // 検索タイムアウトをクリア
    clearTimeout(searchTimeout);
    
    if (query.length === 0) {
      searchResults.style.display = 'none';
      selectedSearchIndex = -1;
      return;
    }
    
    // 一定時間後に検索実行（レスポンス向上のため）
    searchTimeout = setTimeout(() => {
      const results = performSearch(query);
      const resultsHtml = renderSearchResults(results);
      searchResults.innerHTML = resultsHtml;
      searchResults.style.display = 'block';
      selectedSearchIndex = -1;
      
      // 検索結果のクリックイベントを設定
      setupSearchResultClickHandlers();
    }, 200);
  });
    // キーボードナビゲーション
  searchInput.addEventListener('keydown', function(e) {
    const resultItems = searchResults.querySelectorAll('.search-result-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedSearchIndex < resultItems.length - 1) {
        updateSearchResultSelection(selectedSearchIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedSearchIndex > 0) {
        updateSearchResultSelection(selectedSearchIndex - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSearchIndex >= 0 && selectedSearchIndex < resultItems.length) {
        const selectedItem = resultItems[selectedSearchIndex];
        if (selectedItem) {
          const results = performSearch(/** @type {HTMLInputElement} */(searchInput).value);
          if (results[selectedSearchIndex]) {
            navigateToSearchResult(results[selectedSearchIndex]);
          }
        }
      }
    } else if (e.key === 'Escape') {
      hideSearchResults();
    }
  });
    // クリアボタンのイベント
  searchClear.addEventListener('click', function() {
    if (searchInput instanceof HTMLInputElement) {
      searchInput.value = '';
    }
    hideSearchResults();
    searchInput.focus();
  });
  
  // 検索フィールド外をクリックした時に結果を非表示
  document.addEventListener('click', function(e) {
    const target = e.target;
    if (target && target instanceof Element && !target.closest('.search-section')) {
      searchResults.style.display = 'none';
    }
  });
}

/**
 * 検索結果のクリックイベントハンドラーを設定
 */
function setupSearchResultClickHandlers() {
  const resultItems = document.querySelectorAll('.search-result-item');
  resultItems.forEach((item, index) => {
    item.addEventListener('click', function() {
      const searchInput = document.getElementById('searchInput');
      if (searchInput instanceof HTMLInputElement) {
        const results = performSearch(searchInput.value);
        if (results[index]) {
          navigateToSearchResult(results[index]);
        }
      }
    });
  });
}

/**
 * 検索結果にスクロール
 * @param {SearchResult} result - 検索結果
 */
function scrollToSearchResult(result) {
  if (result.type === 'org') {
    scrollToOrganization(result.node);
  } else if (result.member) {
    scrollToMember(result.member, result.node);
  }
}

/**
 * 組織にスクロール
 * @param {OrgNode} node - 組織ノード
 */
function scrollToOrganization(node) {
  // 組織ヘッダーを見つけてスクロール
  const orgHeaders = document.querySelectorAll('.org-header');
  for (const header of orgHeaders) {
    const orgName = header.querySelector('.org-name');
    if (orgName && orgName.textContent && orgName.textContent.includes(node.name)) {
      header.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // ハイライト効果
      if (header instanceof HTMLElement) {
        header.style.background = '#e6fffa';
        setTimeout(() => {
          header.style.background = '';
        }, 2000);
      }
      break;
    }
  }
}

/**
 * メンバーにスクロール
 * @param {Member} member - メンバー
 * @param {OrgNode} orgNode - 所属組織ノード
 */
function scrollToMember(member, orgNode) {
  // メンバー要素を見つけてスクロール
  const memberElements = document.querySelectorAll('.member');
  for (const memberEl of memberElements) {
    if (memberEl.textContent && 
        memberEl.textContent.includes(member.name) && 
        memberEl.textContent.includes(member.number)) {
      memberEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // ハイライト効果
      if (memberEl instanceof HTMLElement) {
        memberEl.style.background = '#e6fffa';
        memberEl.style.borderColor = '#4fd1c7';
        setTimeout(() => {
          memberEl.style.background = '';
          memberEl.style.borderColor = '';
        }, 2000);
      }
      break;
    }
  }
}

// =============================================================================
// 設定・制御機能
// =============================================================================

/**
 * 設定を適用してチャートを再描画
 */
function applySettings() {
  const thresholdInput = document.getElementById('leaderThreshold');
  if (thresholdInput && currentTreeData) {
    leaderThreshold = parseInt(/** @type {HTMLInputElement} */(thresholdInput).value) || 100;
    rerenderChart();
  }
}

/**
 * チャートを再レンダリング
 */
function rerenderChart() {
  if (!currentTreeData) return;
  
  // 総人数を再計算
  if (currentTreeData.children) {
    for (const key of Object.keys(currentTreeData.children)) {
      calculateTotalMembers(currentTreeData.children[key]);
    }
  }

  const orgChartDiv = document.getElementById('orgChart');
  if (!orgChartDiv) return;
  
  orgChartDiv.innerHTML = generateTreeHTML(currentTreeData);
  
  // 検索インデックスを再構築
  buildSearchIndex(currentTreeData);
}

/**
 * ツリーデータからHTMLを生成
 * @param {Object} treeData - ツリーデータ
 * @returns {string} 生成されたHTML
 */
function generateTreeHTML(treeData) {
  let html = '';
  if (treeData.children) {
    const sortedKeys = sortChildrenKeys(treeData.children);
    for (const key of sortedKeys) {
      html += renderTree(treeData.children[key], 0);
    }
  }
  return html;
}

/**
 * セクションの折りたたみ・展開を切り替え
 * @param {string} nodeId - ノードID
 */
function toggleSection(nodeId) {
  const membersElement = document.getElementById(`members-${nodeId}`);
  const childrenElement = document.getElementById(`children-${nodeId}`);
  const iconElement = document.getElementById(`icon-${nodeId}`);
  
  let isCollapsed = false;
  
  if (membersElement) {
    isCollapsed = membersElement.style.display === 'none';
    membersElement.style.display = isCollapsed ? 'block' : 'none';
  }
  
  if (childrenElement) {
    isCollapsed = childrenElement.style.display === 'none';
    childrenElement.style.display = isCollapsed ? 'block' : 'none';
  }
  
  if (iconElement) {
    iconElement.className = isCollapsed ? 'fas fa-chevron-down toggle-icon' : 'fas fa-chevron-right toggle-icon';
  }
}

// =============================================================================
// HTMLエクスポート機能
// =============================================================================

/**
 * 現在の組織図をHTMLファイルとしてダウンロード
 */
function downloadHTML() {
  if (!currentTreeData) return;
  
  const orgChartDiv = document.getElementById('orgChart');
  if (!orgChartDiv) return;
  
  const htmlContent = generateExportHTML(orgChartDiv.innerHTML);
  downloadFile(htmlContent, `組織図_${getCurrentDateString()}.html`, 'text/html');
}

/**
 * エクスポート用HTMLコンテンツを生成
 * @param {string} chartHTML - 組織図のHTML
 * @returns {string} 完全なHTMLドキュメント
 */
function generateExportHTML(chartHTML) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>組織図一覧 - エクスポート</title>
  <link rel="stylesheet" href="assets/css/noto-sans-jp.css">
  <link rel="stylesheet" href="assets/css/fontawesome.min.css">
  <style>
    ${getExportStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1 class="title">組織図一覧</h1>
      <p class="subtitle">生成日時: ${new Date().toLocaleString('ja-JP')}</p>
    </header>
    <div class="chart-section">
      <div class="search-section">
        <div class="search-container">
          <div class="search-input-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input type="text" id="searchInput" class="search-input" placeholder="組織名または職員名で検索..." autocomplete="off">
            <button class="search-clear" id="searchClear" style="display: none;">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="search-results" id="searchResults" style="display: none;"></div>
        </div>
      </div>
      <div class="org-chart">
        ${chartHTML}
      </div>
    </div>
  </div>
  <script>
    ${getExportScript()}
  </script>
</body>
</html>`;
}

/**
 * エクスポート用CSSスタイルを取得
 * @returns {string} CSSスタイル
 */
function getExportStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fafafa; color: #1a202c; line-height: 1.7; -webkit-font-smoothing: antialiased; }
    .container { max-width: 1400px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 48px; padding: 24px 0; }
    .title { font-size: 2.75rem; font-weight: 800; margin-bottom: 12px; color: #1a202c; letter-spacing: -0.025em; }
    .subtitle { font-size: 1.125rem; color: #718096; font-weight: 400; }
    .chart-section { background: white; border-radius: 20px; box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08); overflow: hidden; border: 1px solid #e2e8f0; }
    .search-section { background: #f7fafc; border-bottom: 1px solid #e2e8f0; padding: 24px; }
    .search-container { max-width: 500px; margin: 0 auto; position: relative; }
    .search-input-wrapper { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 16px; color: #a0aec0; font-size: 1rem; z-index: 2; }
    .search-input { width: 100%; padding: 16px 20px 16px 50px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; background: white; color: #2d3748; }
    .search-input:focus { outline: none; border-color: #4299e1; box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1); }
    .search-clear { position: absolute; right: 12px; background: #a0aec0; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }
    .search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); z-index: 1000; max-height: 400px; overflow-y: auto; }
    .search-result-item { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 12px; }
    .search-result-item:hover, .search-result-item.selected { background: #edf2f7; }
    .search-result-icon { color: #4299e1; font-size: 1rem; }
    .search-result-content { flex: 1; }
    .search-result-name { font-weight: 600; color: #2d3748; margin-bottom: 4px; }
    .search-result-path { font-size: 0.875rem; color: #718096; }
    .search-no-results { padding: 20px; text-align: center; color: #718096; }
    .org-chart { padding: 40px; }
    .tree-root { list-style: none; margin: 0; padding: 0; }
    .org-node { list-style: none; margin: 20px 0; position: relative; border-left: 3px solid #e2e8f0; padding-left: 24px; }
    .org-node.level-0 { border-left-color: #4299e1; margin-bottom: 32px; }
    .org-node.level-1 { border-left-color: #48bb78; }
    .org-node.level-2 { border-left-color: #ed8936; }
    .org-header { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; padding: 20px 24px; background: #f7fafc; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); cursor: pointer; }
    .org-header:hover { background: #edf2f7; }
    .toggle-icon { color: #4299e1; font-size: 1rem; margin-right: 8px; }
    .org-bullet { color: #a0aec0; font-size: 0.6rem; margin-right: 8px; }
    .org-name { color: #1a202c; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 12px; letter-spacing: -0.025em; }
    .org-code { background: #4299e1; color: white; padding: 6px 12px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; box-shadow: 0 2px 4px rgba(66, 153, 225, 0.3); }
    .org-stats { background: #48bb78; color: white; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; box-shadow: 0 2px 4px rgba(72, 187, 120, 0.3); }
    .members-list { list-style: none; margin: 0 0 20px 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
    .children-list { list-style: none; margin: 0; padding: 0; }
    .member { background: #f7fafc; border: 1px solid #e2e8f0; color: #2d3748; font-weight: 500; padding: 16px 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
    .member.leader { background: #fffaf0; border: 2px solid #ed8936; color: #c05621; font-weight: 700; box-shadow: 0 4px 12px rgba(237, 137, 54, 0.15); }
    .search-highlight-temp { background: #e6fffa !important; border-color: #4fd1c7 !important; }
    @media print { body { background: white !important; } .chart-section { box-shadow: none !important; border: 1px solid #e2e8f0 !important; } .org-header { break-inside: avoid; } }
    @media (max-width: 768px) { .container { padding: 20px 16px; } .org-chart { padding: 24px 16px; } .members-list { grid-template-columns: 1fr; } .org-header { flex-direction: column; align-items: flex-start; gap: 12px; padding: 16px 20px; } }
  `;
}

/**
 * エクスポート用JavaScriptを取得
 * @returns {string} エクスポート用スクリプト
 */
function getExportScript() {
  return `
    // エクスポート用検索データ（ビルド時に埋め込み）
    let searchIndex = ${JSON.stringify(searchIndex)};
    let selectedSearchIndex = -1;
    
    function toggleSection(nodeId) {
      const membersElement = document.getElementById('members-' + nodeId);
      const childrenElement = document.getElementById('children-' + nodeId);
      const iconElement = document.getElementById('icon-' + nodeId);
      
      let isCollapsed = false;
      
      if (membersElement) {
        isCollapsed = membersElement.style.display === 'none';
        membersElement.style.display = isCollapsed ? 'block' : 'none';
      }
      
      if (childrenElement) {
        isCollapsed = childrenElement.style.display === 'none';
        childrenElement.style.display = isCollapsed ? 'block' : 'none';
      }
      
      if (iconElement) {
        iconElement.className = isCollapsed ? 'fas fa-chevron-down toggle-icon' : 'fas fa-chevron-right toggle-icon';
      }
    }
    
    function performSearch(query) {
      if (!query || query.length < 1) return [];
      
      const lowerQuery = query.toLowerCase();
      const results = [];
      
      searchIndex.forEach(item => {
        let matchScore = 0;
        let matchText = '';
        
        if (item.type === 'org') {
          if (item.orgName.toLowerCase().includes(lowerQuery)) {
            matchScore = item.orgName.toLowerCase() === lowerQuery ? 100 : 50;
            matchText = item.orgName;
          } else if (item.orgCode.toLowerCase().includes(lowerQuery)) {
            matchScore = item.orgCode.toLowerCase() === lowerQuery ? 90 : 40;
            matchText = item.orgCode;
          }
        } else if (item.type === 'member' && item.member) {
          if (item.member.name.toLowerCase().includes(lowerQuery)) {
            matchScore = item.member.name.toLowerCase() === lowerQuery ? 100 : 60;
            matchText = item.member.name;
          } else if (item.member.number.toLowerCase().includes(lowerQuery)) {
            matchScore = item.member.number.toLowerCase() === lowerQuery ? 95 : 45;
            matchText = item.member.number;
          } else if (item.member.position.toLowerCase().includes(lowerQuery)) {
            matchScore = item.member.position.toLowerCase() === lowerQuery ? 80 : 35;
            matchText = item.member.position;
          }
        }
        
        if (matchScore > 0) {
          results.push({ ...item, matchScore, matchText });
        }
      });
      
      return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
    }
    
    function renderSearchResults(results) {
      if (results.length === 0) {
        return '<div class="search-no-results">検索結果が見つかりませんでした</div>';
      }
      
      return results.map((result, index) => {
        const isSelected = index === selectedSearchIndex;
        const pathText = result.orgPath.join(' > ');
        
        if (result.type === 'org') {
          return \`
            <div class="search-result-item \${isSelected ? 'selected' : ''}" data-index="\${index}" data-type="org">
              <i class="fas fa-building search-result-icon"></i>
              <div class="search-result-content">
                <div class="search-result-name">\${escapeHTML(result.orgName)}</div>
                <div class="search-result-path">\${escapeHTML(pathText)}</div>
              </div>
            </div>
          \`
        } else if (result.member) {
          return \`
            <div class="search-result-item search-result-member \${isSelected ? 'selected' : ''}" data-index="\${index}" data-type="member">
              <i class="fas fa-user search-result-icon"></i>
              <div class="search-result-content">
                <div class="search-result-name">\${escapeHTML(result.member.name)}</div>
                <div class="search-result-path">\${escapeHTML(pathText)}</div>
                <div class="search-result-path">\${escapeHTML(result.member.position)} • \${escapeHTML(result.member.number)}</div>
              </div>
            </div>
          \`
        }
      }).join('');
    }
    
    function escapeHTML(str) {
      const escapeMap = {
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
        '<': '&lt;',
        '>': '&gt;'
      };
      
      return String(str).replace(/[&"'<>]/g, function(match) {
        return escapeMap[match];
      });
    }
    
    function scrollToSearchResult(result) {
      if (result.type === 'org') {
        const orgHeaders = document.querySelectorAll('.org-header');
        for (const header of orgHeaders) {
          const orgName = header.querySelector('.org-name');
          if (orgName && orgName.textContent && orgName.textContent.includes(result.orgName)) {
            header.scrollIntoView({ behavior: 'smooth', block: 'center' });
            header.style.background = '#e6fffa';
            setTimeout(() => { header.style.background = ''; }, 2000);
            break;
          }
        }
      } else if (result.member) {
        const memberElements = document.querySelectorAll('.member');
        for (const memberEl of memberElements) {
          if (memberEl.textContent && 
              memberEl.textContent.includes(result.member.name) && 
              memberEl.textContent.includes(result.member.number)) {
            memberEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            memberEl.style.background = '#e6fffa';
            memberEl.style.borderColor = '#4fd1c7';
            setTimeout(() => {
              memberEl.style.background = '';
              memberEl.style.borderColor = '';
            }, 2000);
            break;
          }
        }
      }
    }
    
    // 検索機能の初期化
    document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.getElementById('searchInput');
      const searchResults = document.getElementById('searchResults');
      const searchClear = document.getElementById('searchClear');
      
      if (!searchInput || !searchResults || !searchClear) return;
      
      let searchTimeout;
      let currentResults = [];
      
      searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        searchClear.style.display = query.length > 0 ? 'block' : 'none';
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          if (query.length === 0) {
            searchResults.style.display = 'none';
            selectedSearchIndex = -1;
            return;
          }
          
          currentResults = performSearch(query);
          selectedSearchIndex = -1;
          searchResults.innerHTML = renderSearchResults(currentResults);
          searchResults.style.display = currentResults.length > 0 ? 'block' : 'none';
          
          // クリックイベントを設定
          const resultItems = searchResults.querySelectorAll('.search-result-item');
          resultItems.forEach((item, index) => {
            item.addEventListener('click', function() {
              if (currentResults[index]) {
                searchResults.style.display = 'none';
                scrollToSearchResult(currentResults[index]);
              }
            });
          });
        }, 300);
      });
      
      searchInput.addEventListener('keydown', function(e) {
        if (!currentResults.length) return;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            selectedSearchIndex = Math.min(selectedSearchIndex + 1, currentResults.length - 1);
            updateSearchSelection();
            break;
          case 'ArrowUp':
            e.preventDefault();
            selectedSearchIndex = Math.max(selectedSearchIndex - 1, -1);
            updateSearchSelection();
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedSearchIndex >= 0 && currentResults[selectedSearchIndex]) {
              searchResults.style.display = 'none';
              scrollToSearchResult(currentResults[selectedSearchIndex]);
            }
            break;
          case 'Escape':
            searchResults.style.display = 'none';
            selectedSearchIndex = -1;
            break;
        }
      });
      
      function updateSearchSelection() {
        const resultItems = document.querySelectorAll('.search-result-item');
        resultItems.forEach((item, index) => {
          item.classList.toggle('selected', index === selectedSearchIndex);
        });
        
        if (selectedSearchIndex >= 0) {
          const selectedItem = resultItems[selectedSearchIndex];
          if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
          }
        }
      }
      
      searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchClear.style.display = 'none';
        searchResults.style.display = 'none';
        selectedSearchIndex = -1;
        currentResults = [];
      });
      
      document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.style.display = 'none';
          selectedSearchIndex = -1;
        }
      });
    });
  `;
}

/**
 * ファイルをダウンロード
 * @param {string} content - ファイル内容
 * @param {string} filename - ファイル名
 * @param {string} mimeType - MIMEタイプ
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 現在の日付を文字列で取得
 * @returns {string} YYYY-MM-DD形式の日付
 */
function getCurrentDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * アプリケーションの初期化
 */
function initializeApplication() {
  const csvInput = document.getElementById('csvFile');
  const orgChartDiv = document.getElementById('orgChart');
  const uploadArea = document.getElementById('uploadArea');

  if (!csvInput || !orgChartDiv || !uploadArea) {
    console.error('必要なDOM要素が見つかりません');
    return;
  }

  setupDragAndDropHandlers(uploadArea);
  setupFileInputHandler(csvInput);
  initializeSearch();
}

/**
 * ドラッグアンドドロップのイベントハンドラーを設定
 * @param {HTMLElement} uploadArea - アップロードエリア要素
 */
function setupDragAndDropHandlers(uploadArea) {
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0 && files[0].type === 'text/csv') {
      processFile(files[0]);
    }
  });
}

/**
 * ファイル入力のイベントハンドラーを設定
 * @param {HTMLElement} csvInput - ファイル入力要素
 */
function setupFileInputHandler(csvInput) {
  csvInput.addEventListener('change', function(e) {
    if (csvInput instanceof HTMLInputElement) {
      const file = csvInput.files?.[0];
      if (file) {
        processFile(file);
      }
    }
  });
}

/**
 * CSVファイルを処理してツリー構造を構築・表示
 * @param {File} file - 処理するCSVファイル
 */
function processFile(file) {
  const reader = new FileReader();
  reader.onload = function(evt) {
    const result = evt?.target?.result;
    if (typeof result !== 'string') {
      alert('ファイルの読み込みに失敗しました。');
      return;
    }
    
    try {
      const { headers, data } = parseCSV(result);
      console.log('Headers:', headers);
      console.log('First data row:', data[0]);
      
      const requiredColumns = validateRequiredColumns(headers);
      if (!requiredColumns) return;
      
      const { nameIdx, numberIdx, positionCodeIdx, positionIdx } = requiredColumns;
      const orgLevels = getOrgLevels(headers);
      currentOrgLevels = orgLevels;
      
      console.log('Organization levels:', orgLevels);
      console.log(`Column indices - Name: ${nameIdx}, Number: ${numberIdx}, Position Code: ${positionCodeIdx}, Position: ${positionIdx}`);
      
      const tree = buildTree(data, orgLevels, nameIdx, numberIdx, positionCodeIdx, positionIdx);
      currentTreeData = tree;
      
      console.log('Tree structure:', tree);
      
      // 総人数を計算
      calculateTreeTotalMembers(tree);
        // チャートを表示
      displayChart(tree);
      
      // UI要素を有効化
      enableSettingsPanelAndDownload();
      
    } catch (error) {
      console.error('CSVファイルの処理中にエラーが発生しました:', error);
      alert('CSVファイルの処理中にエラーが発生しました。ファイル形式を確認してください。');
    }
  };
  reader.readAsText(file, 'utf-8');
}

/**
 * 必須列の存在を検証
 * @param {string[]} headers - CSVヘッダー
 * @returns {Object|null} 列インデックス情報またはnull
 */
function validateRequiredColumns(headers) {
  const nameIdx = headers.indexOf('氏名');
  const numberIdx = headers.indexOf('職員番号');
  const positionCodeIdx = headers.indexOf('役職コード');
  const positionIdx = headers.indexOf('役職');
  
  if (nameIdx === -1 || numberIdx === -1 || positionCodeIdx === -1 || positionIdx === -1) {
    alert('CSVファイルに必要な列（氏名、職員番号、役職コード、役職）が見つかりません。');
    return null;
  }
  
  return { nameIdx, numberIdx, positionCodeIdx, positionIdx };
}

/**
 * ツリー全体の総人数を計算
 * @param {Object} tree - ツリーのルートオブジェクト
 */
function calculateTreeTotalMembers(tree) {
  if (tree.children) {
    for (const key of Object.keys(tree.children)) {
      calculateTotalMembers(tree.children[key]);
    }
  }
}

/**
 * チャートを表示
 * @param {Object} tree - 表示するツリーデータ
 */
function displayChart(tree) {
  const orgChartDiv = document.getElementById('orgChart');
  if (!orgChartDiv) return;
  
  orgChartDiv.innerHTML = generateTreeHTML(tree);
  
  // 検索セクションを表示
  const searchSection = document.getElementById('searchSection');
  if (searchSection) {
    searchSection.style.display = 'block';
  }
  
  // 検索インデックスを構築
  buildSearchIndex(tree);
}

/**
 * 設定パネルとダウンロードボタンを有効化
 */
function enableSettingsPanelAndDownload() {
  const settingsPanel = document.getElementById('settingsPanel');
  const downloadBtn = document.getElementById('downloadBtn');
  if (settingsPanel) {
    settingsPanel.style.display = 'block';
  }
  if (downloadBtn) {
    /** @type {HTMLButtonElement} */(downloadBtn).disabled = false;
  }
}

// アプリケーション開始
initializeApplication();

// =============================================================================
// ユーティリティ機能
// =============================================================================

/**
 * XSS攻撃を防ぐためのHTML文字列エスケープ
 * @param {string} str - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
function escapeHTML(str) {
  const escapeMap = {
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
    '<': '&lt;',
    '>': '&gt;'
  };
  
  return String(str).replace(/[&"'<>]/g, function(match) {
    return escapeMap[match];
  });
}
