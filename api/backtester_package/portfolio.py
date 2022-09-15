import backtester_package.backtester as backtester
from backtester_package.order import Order


class Portfolio:

    def __init__(self, balance=1):
        self.balance = balance
        self.positions = {}

    def order(self, type, symbol, quantity):
        if symbol not in self.positions.keys():
            self.positions[symbol] = {"long": [], "short": []}
        order = Order(type, symbol, quantity)
        try:
            self.balance -= order.open()
        except AssertionError:
            print("unable to open order")
            return order
        self.positions[symbol][type].append(order)
        return order

    def close_order(self, order):
        self.balance += order.close()
        self.positions[order.symbol][order.type].remove(order)
        if self.positions[order.symbol]["long"] == [] and self.positions[order.symbol]["short"] == []:
            del self.positions[order.symbol]

    def cut_order(self, order, quantity):
        self.balance += order.cut(quantity)

    def value(self):
        symbols = self.positions.keys()
        values = [self.shares_of(symbol) * backtester.price_history[symbol][backtester.datetime] for symbol in symbols]
        return sum(values) + self.balance

    def shares_of(self, symbol, type='all'):
        assert type == "all" or type == "long" or type == "short", "'type' parameter must be 'all', 'long', or 'short'."
        if symbol not in self.positions.keys():
            return 0
        if type == 'all':
            return sum([order.quantity for order in self.positions[symbol]["long"]]) \
                   - sum([order.quantity for order in self.positions[symbol]["short"]])
        elif type == 'long':
            return sum([order.quantity for order in self.positions[symbol]["long"]])
        else:
            return sum([order.quantity for order in self.positions[symbol]["short"]])