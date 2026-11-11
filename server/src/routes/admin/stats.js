import { Router } from 'express';
import { CateringEnquiry } from '../../models/CateringEnquiry.js';
import { ContactMessage } from '../../models/ContactMessage.js';
import { MenuCategory } from '../../models/MenuCategory.js';
import { MenuItem } from '../../models/MenuItem.js';
import { Order } from '../../models/Order.js';
import { Reservation } from '../../models/Reservation.js';
import { fromPence } from '../../utils/money.js';
import { earnedPence, isEarnedOrder, isToCollect } from '../../services/payments.js';
import { addDays, londonDateString, londonDayRange, londonTimeString } from '../../utils/time.js';

const router = Router();
const LIST_SIZE = 5;

router.get('/', async (_req, res) => {
  const today = londonDateString();
  const nowTime = londonTimeString();
  const { start, end } = londonDayRange(today);
  const createdToday = { createdAt: { $gte: start, $lt: end } };

  const [
    ordersToday,
    reservationsToday,
    enquiriesToday,
    messagesToday,
    revenue,
    pendingOrders,
    pendingReservations,
    pendingEnquiries,
    unreadMessages,
    items,
    unavailable,
    categories,
    recentOrders,
    upcomingReservations,
  ] = await Promise.all([
    Order.countDocuments(createdToday),
    // Bookings for today's date (what the floor staff care about), excluding cancellations.
    Reservation.countDocuments({ date: today, status: { $nin: ['cancelled'] } }),
    CateringEnquiry.countDocuments(createdToday),
    ContactMessage.countDocuments(createdToday),
    Order.find(createdToday).select('total status payment').lean(),
    Order.countDocuments({ status: { $nin: ['completed', 'cancelled', 'pending-payment'] } }),
    Reservation.countDocuments({ status: 'pending', date: { $gte: today } }),
    CateringEnquiry.countDocuments({ status: 'new' }),
    ContactMessage.countDocuments({ status: 'unread' }),
    MenuItem.countDocuments(),
    MenuItem.countDocuments({ available: false }),
    MenuCategory.countDocuments(),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(LIST_SIZE)
      .select('reference status total fulfilment customer.name createdAt payment.method payment.status payment.methodType')
      .lean(),
    Reservation.find({
      status: { $in: ['pending', 'confirmed'] },
      $or: [{ date: { $gt: today } }, { date: today, time: { $gte: nowTime } }],
    })
      .sort({ date: 1, time: 1 })
      .limit(LIST_SIZE)
      .select('reference name guests date time status')
      .lean(),
  ]);

  // Earned totals for fixed windows — same rule and London days as /admin/revenue, so the two always agree.
  const earnedOrders = await Order.find({ status: { $ne: 'cancelled' } }).select('total status payment createdAt').lean();
  const since = (days) => londonDayRange(addDays(today, -(days - 1))).start;
  const windowTotal = (from) => {
    const list = earnedOrders.filter((o) => isEarnedOrder(o) && (!from || o.createdAt >= from));
    return { earned: fromPence(list.reduce((s, o) => s + earnedPence(o), 0)), orders: list.length };
  };
  const lastOrder = earnedOrders.filter(isEarnedOrder).sort((a, b) => b.createdAt - a.createdAt)[0];

  res.json({
    periods: {
      today: windowTotal(start),
      last7: windowTotal(since(7)),
      last30: windowTotal(since(30)),
      allTime: windowTotal(null),
      lastEarnedAt: lastOrder?.createdAt ?? null,
    },
    today: {
      orders: ordersToday,
      reservations: reservationsToday,
      enquiries: enquiriesToday,
      messages: messagesToday,
      revenue: fromPence(revenue.reduce((sum, o) => sum + earnedPence(o), 0)),
      toCollect: fromPence(revenue.filter(isToCollect).reduce((sum, o) => sum + Math.round(o.total * 100), 0)),
    },
    pending: {
      orders: pendingOrders,
      reservations: pendingReservations,
      enquiries: pendingEnquiries,
      unreadMessages,
    },
    menu: { items, unavailable, categories },
    recentOrders: recentOrders.map((o) => ({
      _id: o._id,
      reference: o.reference,
      status: o.status,
      total: o.total,
      fulfilment: o.fulfilment,
      customer: { name: o.customer?.name ?? '' },
      payment: o.payment ?? { method: 'in-person', status: 'unpaid' },
      createdAt: o.createdAt,
    })),
    upcomingReservations,
  });
});

export default router;
