import backtester_package.backtester as backtester


class Order:
    current_id = -1

    def __init__(self, type, symbol, quantity):
        assert type == "long" or type == "short", "'type' parameter must be 'long' or 'short'"
        self.type = type
        self.symbol = symbol
        self.quantity = quantity
        self.open_date = None
        self.close_date = None
        self.log = []
        if type == "long":
            self.sign = 1
        else:
            self.sign = -1
        Order.current_id += 1
        self.id = symbol + '/' + str(Order.current_id)

    def open(self):
        value = self.value()
        assert value is not None, "unable to calculate order value."
        self.open_date = backtester.datetime
        # print("Order opened on " + self.open_date
                        # + ". Type: " + self.type + " Symbol: " + self.symbol + " Quantity " + str(self.quantity) + ".")
        self.log.append("Order opened on " + self.open_date
                        + ". Type: " + self.type + " Symbol: " + self.symbol + " Quantity " + str(self.quantity) + ".")
        return value

    def close(self):
        self.close_date = backtester.datetime
        # print("Order closed on " + self.close_date
                        # + ". Type: " + self.type + " Symbol: " + self.symbol + " Quantity " + str(self.quantity) + ".")
        self.log.append("Order closed on " + self.close_date
                        + ". Type: " + self.type + " Symbol: " + self.symbol + " Quantity " + str(self.quantity) + ".")
        return self.value()

    def value(self):
        return self.sign * self.quantity * float(backtester.price_history[self.symbol][backtester.datetime])

    def cut(self, quantity):
        assert self.quantity > quantity, "order cannot be cut by more than its quantity"
        self.quantity -= quantity
        # print(
            # "Order cut by " + str(quantity) + " on " + backtester.datetime + "." + "Transaction: " + str(self.value()) + ".")
        self.log.append(
            "Order cut by " + str(quantity) + " on " + backtester.datetime + "." + "Transaction: " + str(self.value()) + ".")
        return self.value()
