import csv
import os.path
import ast
import statistics

import pandas_datareader as web
from statistics import stdev
import math

import backtester_package.backtester as backtester


def close_FIFO(symbol, type, quantity):
    assert type == "long" or type == "short", "'type' parameter must be 'long' or 'short'."
    assert backtester.portfolio.shares_of(symbol, type) >= quantity, "cannot close more shares than exist in portfolio"
    orders = backtester.portfolio.positions[symbol][type]
    while quantity > 0 and quantity >= orders[0].quantity:
        order = orders[0]
        backtester.portfolio.close_order(order)
        quantity -= order.quantity
        if len(orders) == 0:
            break
    if quantity > 0:
        if len(orders) == 0:
            return
        backtester.portfolio.cut_order(orders[0], quantity)


def close_LIFO(symbol, type, quantity):
    assert type == "long" or type == "short", "'type' parameter must be 'long' or 'short'."
    assert backtester.portfolio.shares_of(symbol, type) > quantity, "cannot close more shares than exist in portfolio"
    orders = backtester.portfolio.positions[symbol][type]
    while quantity >= orders[len(orders) - 1].quantity:
        order = orders[len(orders) - 1]
        backtester.portfolio.close_order(order)
        quantity -= order.quantity
    if quantity > 0:
        backtester.portfolio.cut_order(orders[len(orders) - 1], quantity)


def apply_string(string):
    def get_type(character):
        if character == "L":
            return "long"
        else:
            return "short"

    def get_order(id, type):
        split = id.split('/')
        for order in backtester.portfolio.positions[split[0]][type]:
            if id == order.id:
                return order
        return -1

    index = 0
    order = [""] * 5
    temp = ""

    if string is None:
        return

    for i in range(len(string)):
        if string[i] == ";":
            order[index] = temp
            index += 1
            temp = ""
        elif string[i] == "!":
            order[index] = temp
            if order[0] == "O":
                type = get_type(order[2])
                backtester.portfolio.order(type, order[1], float(order[3]))
            elif order[0] == "CO":
                type = get_type(order[1])
                order_to_sell = get_order(order[2], type)
                backtester.portfolio.close_order(order_to_sell)
            elif order[0] == "TP":
                target_percent(ast.literal_eval(order[1]))
            elif order[0] == "TQ":
                target_quantity(ast.literal_eval(order[1]))
            elif order[0] == "CU":
                type = get_type(order[1])
                order_to_sell = get_order(order[2], type)
                backtester.portfolio.cut_order(order_to_sell, order[3])
            else:
                type = get_type(order[2])
                if order[4] == "F":
                    close_FIFO(order[1], type, float(order[3]))
                else:
                    close_LIFO(order[1], type, float(order[3]))

            index = 0
            temp = ""
        else:
            temp += string[i]


def close_all(symbol, type="all"):
    assert type == "all" or type == "long" or type == "short", "'type' parameter must be 'all', 'long', or 'short'."
    if type == "all" or type == "long":
        for order in backtester.portfolio.positions[symbol]["long"]:
            backtester.portfolio.close_order(order)
    if type == "all" or type == "short":
        for order in backtester.portfolio.positions[symbol]["short"]:
            backtester.portfolio.close_order(order)


def target_percent(percentages):
    portfolio_value = backtester.portfolio.value()
    quantities = {symbol: percentages[symbol] * portfolio_value / price(symbol) for symbol in percentages}
    target_quantity(quantities)


def target_quantity(quantities):
    for symbol in quantities:
        quantity = quantities[symbol]
        if quantity >= 0:
            if backtester.portfolio.shares_of(symbol, 'short') > 0:
                close_all(symbol, 'short')
            difference = quantity - backtester.portfolio.shares_of(symbol, 'long')
            if difference > 0:
                backtester.portfolio.order('long', symbol, difference)
            elif difference != 0:
                close_FIFO(symbol, 'long', -difference)
        else:
            if backtester.portfolio.shares_of(symbol, 'long') > 0:
                close_all(symbol, 'long')
            difference = backtester.portfolio.shares_of(symbol, 'short') - quantity
            if difference > 0:
                backtester.portfolio.order('short', symbol, difference)
            elif difference != 0:
                close_FIFO(symbol, 'short', -difference)


def price(symbol):
    return float(backtester.price_history[symbol][backtester.datetime])


def download_directory(symbol_csv, start, end):
    companies = csv.reader(open(symbol_csv))
    directory = symbol_csv.split(sep='!')[0] + '_history'
    if not os.path.isdir(directory):
        os.mkdir(directory)

    for company in companies:
        symbol, name, sector = company
        file_name = directory + '/{}.csv'.format(symbol)
        try:
            data = web.DataReader(symbol, 'yahoo', start, end)
            f = open(file_name, 'w')
            f.write(data.to_csv())
        except:
            print(symbol + " error")

    print('download complete')


def sharpe(returns, risk_free_rate):
    avg_return = statistics.mean(returns)
    return (avg_return - risk_free_rate) / stdev(returns)
