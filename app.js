/* 随手记 · 个人记账本
 * 纯前端小项目：无框架、无依赖、无后端，数据存本机 localStorage。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'personal-ledger.transactions.v1';
  var SEED_KEY = 'personal-ledger.seeded.v1';

  var CATS = {
    expense: ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '学习', '其他'],
    income: ['工资', '奖金', '兼职', '理财', '红包', '其他']
  };

  var PALETTE = ['#6366f1', '#0ea5e9', '#f97316', '#ec4899', '#14b8a6',
                 '#eab308', '#8b5cf6', '#ef4444', '#22c55e', '#94a3b8'];

  var state = {
    txs: [],
    type: 'expense',
    month: 'all',
    category: 'all'
  };

  var el = {};

  /* ---------------- utils ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function currentMonth() { return todayStr().slice(0, 7); }

  function monthOf(dateStr) { return String(dateStr || '').slice(0, 7); }

  function money(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    var neg = v < 0;
    v = Math.abs(v);
    var parts = v.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-¥' : '¥') + parts.join('.');
  }

  function uid() {
    return 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- storage ---------------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state.txs = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.txs)) state.txs = [];
    } catch (e) {
      state.txs = [];
    }
    if (!localStorage.getItem(SEED_KEY)) {
      state.txs = state.txs.concat(seedData());
      localStorage.setItem(SEED_KEY, '1');
      save();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.txs));
    } catch (e) { /* 忽略隐私模式下的写入失败 */ }
  }

  function seedData() {
    var m = currentMonth();
    var y = m.slice(0, 4), mm = m.slice(5, 7);
    var d = function (day) { return y + '-' + mm + '-' + pad(day); };
    return [
      { id: uid(), type: 'income',  amount: 6800, category: '工资', date: d(5),  note: '本月工资' },
      { id: uid(), type: 'expense', amount: 32,   category: '餐饮', date: d(6),  note: '午饭' },
      { id: uid(), type: 'expense', amount: 6,    category: '交通', date: d(6),  note: '地铁' },
      { id: uid(), type: 'expense', amount: 268,  category: '购物', date: d(8),  note: '冬季外套' },
      { id: uid(), type: 'expense', amount: 45,   category: '娱乐', date: d(9),  note: '电影票' },
      { id: uid(), type: 'expense', amount: 1500, category: '居住', date: d(10), note: '房租' },
      { id: uid(), type: 'expense', amount: 78,   category: '医疗', date: d(11), note: '感冒药' },
      { id: uid(), type: 'income',  amount: 300,  category: '红包', date: d(11), note: '朋友转账' }
    ];
  }

  /* ---------------- selectors ---------------- */
  function monthsAvailable() {
    var set = {};
    state.txs.forEach(function (t) { set[monthOf(t.date)] = true; });
    if (!set[currentMonth()]) set[currentMonth()] = true;
    return Object.keys(set).sort().reverse();
  }

  function inScope(t) {
    if (state.month !== 'all' && monthOf(t.date) !== state.month) return false;
    if (state.category !== 'all' && t.category !== state.category) return false;
    return true;
  }

  function scopedTxs() {
    return state.txs.filter(inScope).sort(function (a, b) {
      if (a.date === b.date) return 0;
      return a.date < b.date ? 1 : -1;
    });
  }

  function monthTxs() {
    var m = state.month === 'all' ? currentMonth() : state.month;
    return state.txs.filter(function (t) { return monthOf(t.date) === m; });
  }

  /* ---------------- render ---------------- */
  function renderTypeToggle() {
    Array.prototype.forEach.call(document.querySelectorAll('.type-btn'), function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-type') === state.type);
    });
  }

  function renderCategorySelect() {
    var list = CATS[state.type];
    var prev = el.categorySelect.value;
    el.categorySelect.innerHTML = list.map(function (c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');
    if (list.indexOf(prev) >= 0) el.categorySelect.value = prev;
  }

  function renderOverview() {
    var list = monthTxs();
    var income = 0, expense = 0, iCount = 0, eCount = 0;
    list.forEach(function (t) {
      if (t.type === 'income') { income += Number(t.amount) || 0; iCount++; }
      else { expense += Number(t.amount) || 0; eCount++; }
    });

    var label = state.month === 'all' ? '本月结余' : state.month.replace('-', ' 年 ') + ' 月结余';
    el.balanceLabel.textContent = label;
    el.balanceValue.textContent = money(income - expense);
    el.incomeValue.textContent = money(income);
    el.expenseValue.textContent = money(expense);
    el.incomeCount.textContent = '共 ' + iCount + ' 笔';
    el.expenseCount.textContent = '共 ' + eCount + ' 笔';

    if (!list.length) {
      el.balanceHint.textContent = '这个月还没有记录，先记一笔吧';
    } else if (income - expense >= 0) {
      el.balanceHint.textContent = '收支平衡，略有结余 👍';
    } else {
      el.balanceHint.textContent = '本月超支 ' + money(expense - income);
    }
  }

  function renderFilters() {
    var months = monthsAvailable();
    var opts = ['<option value="all">全部月份</option>'].concat(months.map(function (m) {
      return '<option value="' + m + '">' + m.replace('-', ' 年 ') + ' 月</option>';
    }));
    el.monthFilter.innerHTML = opts.join('');
    el.monthFilter.value = months.indexOf(state.month) >= 0 || state.month === 'all'
      ? state.month : 'all';

    var allCats = [];
    state.txs.forEach(function (t) {
      if (allCats.indexOf(t.category) < 0) allCats.push(t.category);
    });
    allCats.sort();
    el.categoryFilter.innerHTML =
      ['<option value="all">全部分类</option>'].concat(allCats.map(function (c) {
        return '<option value="' + c + '">' + c + '</option>';
      })).join('');
    el.categoryFilter.value = allCats.indexOf(state.category) >= 0 ? state.category : 'all';
  }

  function groupByDay(list) {
    var order = [], map = {};
    list.forEach(function (t) {
      if (!map[t.date]) { map[t.date] = []; order.push(t.date); }
      map[t.date].push(t);
    });
    return order.map(function (d) { return { date: d, items: map[d] }; });
  }

  function renderList() {
    var list = scopedTxs();
    el.emptyState.hidden = list.length > 0;

    var html = groupByDay(list).map(function (g) {
      var daySum = g.items.reduce(function (s, t) {
        return s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
      }, 0);
      var rows = g.items.map(function (t) {
        var sign = t.type === 'income' ? '+' : '-';
        return '' +
          '<div class="tx-item">' +
            '<div class="tx-avatar ' + t.type + '">' + escapeHtml(t.category.slice(0, 1)) + '</div>' +
            '<div class="tx-main">' +
              '<div class="tx-cat">' + escapeHtml(t.category) + '</div>' +
              (t.note ? '<div class="tx-note">' + escapeHtml(t.note) + '</div>' : '') +
            '</div>' +
            '<div class="tx-side">' +
              '<div class="tx-amount ' + t.type + '">' + sign + money(t.amount).replace('¥', '') + '</div>' +
              '<div class="tx-date">' + escapeHtml(t.date) + '</div>' +
            '</div>' +
            '<button class="tx-del" type="button" data-id="' + t.id + '" title="删除">×</button>' +
          '</div>';
      }).join('');

      return '<div class="day-group-title">' + escapeHtml(g.date) + ' · 当日合计 ' +
             money(daySum) + '</div>' + rows;
    }).join('');

    el.txList.innerHTML = html;
  }

  function renderChart() {
    var m = state.month === 'all' ? currentMonth() : state.month;
    var expenses = state.txs.filter(function (t) {
      return t.type === 'expense' && monthOf(t.date) === m;
    });

    var totals = {};
    expenses.forEach(function (t) {
      totals[t.category] = (totals[t.category] || 0) + (Number(t.amount) || 0);
    });

    var rows = Object.keys(totals).map(function (k) {
      return { name: k, value: totals[k] };
    }).sort(function (a, b) { return b.value - a.value; });

    var sum = rows.reduce(function (s, r) { return s + r.value; }, 0);

    if (!sum) {
      el.donut.innerHTML = '';
      el.chartLegend.innerHTML = '';
      el.chartEmpty.hidden = false;
      return;
    }
    el.chartEmpty.hidden = true;

    var r = 44, cx = 60, cy = 60, C = 2 * Math.PI * r;
    var offset = 0;
    var circles = rows.map(function (row, i) {
      var frac = row.value / sum;
      var len = frac * C;
      var color = PALETTE[i % PALETTE.length];
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke="' + color + '" ' +
                'stroke-width="16" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" ' +
                'stroke-dashoffset="' + (-offset).toFixed(2) + '"></circle>';
      offset += len;
      return seg;
    }).join('');

    el.donut.innerHTML =
      '<circle cx="60" cy="60" r="44" stroke="#eef0f4" stroke-width="16"></circle>' + circles +
      '<g transform="rotate(90 60 60)">' +
        '<text x="60" y="56" text-anchor="middle" font-size="9" fill="#9aa1ae">合计</text>' +
        '<text x="60" y="70" text-anchor="middle" font-size="13" font-weight="700" fill="#1c1f26">' +
          money(sum).replace('¥', '¥') + '</text>' +
      '</g>';

    el.chartLegend.innerHTML = rows.map(function (row, i) {
      var pct = (row.value / sum * 100).toFixed(1);
      return '<li class="legend-row">' +
        '<span class="legend-dot" style="background:' + PALETTE[i % PALETTE.length] + '"></span>' +
        '<span class="legend-name">' + escapeHtml(row.name) + '</span>' +
        '<span class="legend-pct">' + pct + '%</span>' +
        '<span class="legend-amt">' + money(row.value) + '</span>' +
      '</li>';
    }).join('');
  }

  function renderAll() {
    renderTypeToggle();
    renderOverview();
    renderFilters();
    renderList();
    renderChart();
  }

  /* ---------------- events ---------------- */
  function onSubmit(e) {
    e.preventDefault();
    var amount = parseFloat(el.amountInput.value);
    if (!(amount > 0)) { el.amountInput.focus(); return; }

    state.txs.push({
      id: uid(),
      type: state.type,
      amount: Math.round(amount * 100) / 100,
      category: el.categorySelect.value,
      date: el.dateInput.value || todayStr(),
      note: el.noteInput.value.trim()
    });
    save();

    el.entryForm.reset();
    el.dateInput.value = todayStr();
    renderCategorySelect();
    renderAll();
    el.amountInput.focus();
  }

  function onTypeClick(e) {
    var btn = e.target.closest('.type-btn');
    if (!btn) return;
    state.type = btn.getAttribute('data-type');
    renderTypeToggle();
    renderCategorySelect();
  }

  function onListClick(e) {
    var btn = e.target.closest('.tx-del');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    state.txs = state.txs.filter(function (t) { return t.id !== id; });
    save();
    renderAll();
  }

  function onMonthChange() {
    state.month = el.monthFilter.value;
    renderAll();
  }

  function onCategoryChange() {
    state.category = el.categoryFilter.value;
    renderList();
  }

  function exportCsv() {
    if (!state.txs.length) { alert('还没有可导出的记录'); return; }
    var head = ['日期', '类型', '分类', '金额', '备注'];
    var rows = state.txs.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    }).map(function (t) {
      return [t.date, t.type === 'income' ? '收入' : '支出', t.category,
              Number(t.amount).toFixed(2), (t.note || '').replace(/"/g, '""')]
        .map(function (c) { return '"' + c + '"'; }).join(',');
    });
    var csv = '\ufeff' + [head.join(',')].concat(rows).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '随手记-明细-' + todayStr() + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function resetAll() {
    if (!confirm('确定要清空所有记账数据吗？此操作不可撤销。')) return;
    state.txs = [];
    state.month = 'all';
    state.category = 'all';
    localStorage.setItem(SEED_KEY, '1');
    save();
    renderAll();
  }

  /* ---------------- init ---------------- */
  function init() {
    el = {
      entryForm: document.getElementById('entryForm'),
      amountInput: document.getElementById('amountInput'),
      categorySelect: document.getElementById('categorySelect'),
      dateInput: document.getElementById('dateInput'),
      noteInput: document.getElementById('noteInput'),
      monthFilter: document.getElementById('monthFilter'),
      categoryFilter: document.getElementById('categoryFilter'),
      txList: document.getElementById('txList'),
      emptyState: document.getElementById('emptyState'),
      donut: document.getElementById('donut'),
      chartLegend: document.getElementById('chartLegend'),
      chartEmpty: document.getElementById('chartEmpty'),
      balanceLabel: document.getElementById('balanceLabel'),
      balanceValue: document.getElementById('balanceValue'),
      balanceHint: document.getElementById('balanceHint'),
      incomeValue: document.getElementById('incomeValue'),
      expenseValue: document.getElementById('expenseValue'),
      incomeCount: document.getElementById('incomeCount'),
      expenseCount: document.getElementById('expenseCount'),
      exportBtn: document.getElementById('exportBtn'),
      resetBtn: document.getElementById('resetBtn')
    };

    load();
    el.dateInput.value = todayStr();
    renderCategorySelect();
    renderAll();

    el.entryForm.addEventListener('submit', onSubmit);
    document.querySelector('.type-toggle').addEventListener('click', onTypeClick);
    el.txList.addEventListener('click', onListClick);
    el.monthFilter.addEventListener('change', onMonthChange);
    el.categoryFilter.addEventListener('change', onCategoryChange);
    el.exportBtn.addEventListener('click', exportCsv);
    el.resetBtn.addEventListener('click', resetAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
