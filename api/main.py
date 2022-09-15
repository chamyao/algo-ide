import sample_strategy
from backtester_package import backtester
from pair_trading import get_pair_strategy
import matplotlib.pyplot as plt

backtester.import_price_history('List of commodity ETFs_history')
# backtester.import_price_history('sp500_history')
strategy, spread, entry, exit = get_pair_strategy('CORN', 'WEAT', 1.5, 0, 10, 300, 1)
# strategy = sample_strategy.moving_cross_strategy
title = 'OUNZ | SGOL, entry:2, exit:0, lookback:50, spread_window:200'
total_return, sharpe, returns, values = backtester.test(strategy, title, '2016-01-01', '2021-01-01', 0)
print(str(sharpe))

# plt.plot(returns)
# plt.plot(values)
# plt.show()

upper_a, lower_a = entry
upper_b, lower_b = exit
# plt.plot(spread)
plt.plot(upper_a)
plt.plot(lower_a)
plt.plot(upper_b)
plt.plot(lower_b)
plt.show()