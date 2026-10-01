// src/utils/chartHelpers.ts

export const getDynamicChartData = (orders: any[]) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const counts = Array(12).fill(0);

  orders.forEach(order => {
    const dateField = order.orderDate || order.dateIn;
    if (dateField) {
      const monthIndex = new Date(dateField).getMonth();
      if (!isNaN(monthIndex)) {
        counts[monthIndex] += 1;
      }
    }
  });

  return months.map((name, index) => ({
    name,
    orders: counts[index]
  }));
};