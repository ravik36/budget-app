const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

const inputs = {
  income: document.getElementById("income"),
  fixedExpenses: document.getElementById("fixedExpenses"),
  variableExpenses: document.getElementById("variableExpenses"),
};

const elements = {
  headlineSavings: document.getElementById("headlineSavings"),
  savingsRate: document.getElementById("savingsRate"),
  leftoverAmount: document.getElementById("leftoverAmount"),
  projectionTotal: document.getElementById("projectionTotal"),
  allocationSavings: document.getElementById("allocationSavings"),
  allocationGoals: document.getElementById("allocationGoals"),
  allocationFlex: document.getElementById("allocationFlex"),
  budgetStatus: document.getElementById("budgetStatus"),
  breakdownLegend: document.getElementById("breakdownLegend"),
};

const breakdownCanvas = document.getElementById("breakdownChart");
const projectionCanvas = document.getElementById("projectionChart");
const breakdownCtx = breakdownCanvas.getContext("2d");
const projectionCtx = projectionCanvas.getContext("2d");

const breakdownColors = ["#c86745", "#2f8f83", "#e1a83a"];

function readBudget() {
  return {
    income: Math.max(0, Number(inputs.income.value) || 0),
    fixedExpenses: Math.max(0, Number(inputs.fixedExpenses.value) || 0),
    variableExpenses: Math.max(0, Number(inputs.variableExpenses.value) || 0),
  };
}

function calculateBudget({ income, fixedExpenses, variableExpenses }) {
  const totalExpenses = fixedExpenses + variableExpenses;
  const leftover = income - totalExpenses;
  const safeLeftover = Math.max(0, leftover);
  const savingsRate = income > 0 ? safeLeftover / income : 0;

  return {
    income,
    fixedExpenses,
    variableExpenses,
    totalExpenses,
    leftover,
    safeLeftover,
    savingsRate,
    projection: Array.from({ length: 12 }, (_, index) => safeLeftover * (index + 1)),
    allocations: {
      emergency: safeLeftover * 0.5,
      goals: safeLeftover * 0.3,
      flex: safeLeftover * 0.2,
    },
  };
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatPercent(value) {
  return percentFormatter.format(value);
}

function updateSummary(data) {
  elements.headlineSavings.textContent = formatCurrency(data.safeLeftover);
  elements.savingsRate.textContent = formatPercent(data.savingsRate);
  elements.leftoverAmount.textContent = formatCurrency(data.leftover);
  elements.projectionTotal.textContent = formatCurrency(data.projection[data.projection.length - 1] || 0);
  elements.allocationSavings.textContent = formatCurrency(data.allocations.emergency);
  elements.allocationGoals.textContent = formatCurrency(data.allocations.goals);
  elements.allocationFlex.textContent = formatCurrency(data.allocations.flex);

  if (data.leftover < 0) {
    elements.budgetStatus.innerHTML =
      `Your plan is overspent by <strong>${formatCurrency(Math.abs(data.leftover))}</strong> each month. ` +
      `Try lowering variable expenses or fixed costs.`;
    return;
  }

  elements.budgetStatus.innerHTML =
    `You are saving <strong>${formatPercent(data.savingsRate)}</strong> of your monthly income, ` +
    `or about <strong>${formatCurrency(data.safeLeftover)}</strong> per month.`;
}

function renderLegend(items) {
  elements.breakdownLegend.innerHTML = "";

  items.forEach((item, index) => {
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `
      <span class="legend-swatch" style="background:${breakdownColors[index]}"></span>
      <span>${item.label}: ${formatCurrency(item.value)}</span>
    `;
    elements.breakdownLegend.appendChild(legendItem);
  });
}

function drawBreakdownChart(data) {
  const chartData = [
    { label: "Fixed", value: data.fixedExpenses },
    { label: "Variable", value: data.variableExpenses },
    { label: "Savings", value: Math.max(0, data.leftover) },
  ];

  renderLegend(chartData);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const { width, height } = breakdownCanvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.33;
  const innerRadius = radius * 0.58;

  breakdownCtx.clearRect(0, 0, width, height);

  if (total <= 0) {
    breakdownCtx.fillStyle = "#5f6776";
    breakdownCtx.font = '16px "Space Grotesk", sans-serif';
    breakdownCtx.textAlign = "center";
    breakdownCtx.fillText("Enter values to see the chart", centerX, centerY);
    return;
  }

  let startAngle = -Math.PI / 2;
  chartData.forEach((item, index) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    breakdownCtx.beginPath();
    breakdownCtx.moveTo(centerX, centerY);
    breakdownCtx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    breakdownCtx.closePath();
    breakdownCtx.fillStyle = breakdownColors[index];
    breakdownCtx.fill();
    startAngle += sliceAngle;
  });

  breakdownCtx.beginPath();
  breakdownCtx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  breakdownCtx.fillStyle = "#fffaf0";
  breakdownCtx.fill();

  breakdownCtx.fillStyle = "#5f6776";
  breakdownCtx.font = '14px "Space Grotesk", sans-serif';
  breakdownCtx.textAlign = "center";
  breakdownCtx.fillText("Monthly", centerX, centerY - 8);

  breakdownCtx.fillStyle = "#1e2430";
  breakdownCtx.font = '700 28px "Space Grotesk", sans-serif';
  breakdownCtx.fillText(formatCurrency(data.income), centerX, centerY + 24);
}

function drawProjectionChart(data) {
  const { width, height } = projectionCanvas;
  const padding = { top: 24, right: 20, bottom: 34, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.projection, 1);

  projectionCtx.clearRect(0, 0, width, height);

  projectionCtx.strokeStyle = "rgba(30, 36, 48, 0.12)";
  projectionCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    projectionCtx.beginPath();
    projectionCtx.moveTo(padding.left, y);
    projectionCtx.lineTo(width - padding.right, y);
    projectionCtx.stroke();
  }

  projectionCtx.beginPath();
  data.projection.forEach((value, index) => {
    const x = padding.left + (chartWidth / (data.projection.length - 1 || 1)) * index;
    const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
    if (index === 0) {
      projectionCtx.moveTo(x, y);
    } else {
      projectionCtx.lineTo(x, y);
    }
  });

  projectionCtx.lineWidth = 4;
  projectionCtx.strokeStyle = "#2f8f83";
  projectionCtx.stroke();

  projectionCtx.lineTo(width - padding.right, height - padding.bottom);
  projectionCtx.lineTo(padding.left, height - padding.bottom);
  projectionCtx.closePath();
  projectionCtx.fillStyle = "rgba(47, 143, 131, 0.14)";
  projectionCtx.fill();

  projectionCtx.fillStyle = "#5f6776";
  projectionCtx.font = '12px "Space Grotesk", sans-serif';

  data.projection.forEach((_, index) => {
    const x = padding.left + (chartWidth / (data.projection.length - 1 || 1)) * index;
    const label = `M${index + 1}`;
    projectionCtx.textAlign = "center";
    projectionCtx.fillText(label, x, height - 12);
  });

  projectionCtx.textAlign = "right";
  for (let i = 0; i <= 4; i += 1) {
    const value = maxValue * (1 - i / 4);
    const y = padding.top + (chartHeight / 4) * i + 4;
    projectionCtx.fillText(formatCurrency(value), padding.left - 8, y);
  }
}

function render() {
  const budget = calculateBudget(readBudget());
  updateSummary(budget);
  drawBreakdownChart(budget);
  drawProjectionChart(budget);
}

document.getElementById("budgetForm").addEventListener("input", render);

render();
