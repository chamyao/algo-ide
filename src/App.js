import logo from './logo.svg';
import './App.css';
import React, {useState, useEffect, useRef} from 'react'
import ReactDOM from 'react-dom/client';
import { getValue } from '@testing-library/user-event/dist/utils';
import Editor from "@monaco-editor/react";
import Dropdown from 'react-bootstrap/Dropdown';
import { Alert } from 'react-bootstrap';
import { render } from '@testing-library/react';
import Plot from 'react-plotly.js';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import {LazyLog} from 'react-lazylog';
import './react-tabs.css';


const starterCode = `
from backtester_package import backtester
import pandas


# load price history into backtester
backtester.import_price_history('sp500_history')

# get relevant data
col_names = ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']
data = pandas.read_csv('sp500_history/AAPL.csv', names=col_names)
dates = data.Date.tolist()[1:]
prices = data.Close.tolist()[1:]
price_history = pandas.Series(prices, index=dates)

# initialize variables
fast_average = price_history.rolling(window=5).mean()
slow_average = price_history.rolling(window=21).mean()
fast_above_prev = None

def run(info):
    def moving_cross_strategy():
        output = ''
        date = backtester.datetime

        # check date range
        if date not in slow_average.index or slow_average[date] is None:
            print("not within valid window")
            return output

        # compare fast and slow averages
        if fast_average[date] > slow_average[date]:
            fast_above = True
        else:
            fast_above = False

        # check for cross
        global fast_above_prev
        if fast_above_prev is None:
            fast_above_prev = fast_above
            return output
        if fast_above and not fast_above_prev:
            output += "TP;{'AAPL': 1.0}!"
        elif fast_above_prev and not fast_above:
            output += "TP;{'AAPL': 0.0}!"
        fast_above_prev = fast_above

        return output

    backtester.test(moving_cross_strategy, 'moving cross', '2016-01-01', '2021-01-01', info)
  `

const simple = `
from backtester_package import backtester
import pandas


# load price history into backtester
backtester.import_price_history('sp500_history')

# get relevant data
col_names = ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']
data = pandas.read_csv('sp500_history/AAPL.csv', names=col_names)
dates = data.Date.tolist()[1:]
prices = data.Close.tolist()[1:]
price_history = pandas.Series(prices, index=dates)

# initialize variables
moving_average = price_history.rolling(window=5).mean()

def run(info):
    def simple():
        date = backtester.datetime
        
        if price_history[date] > moving_average[date]:
            output = "TP;{'AAPL': 1.0}!"
        else:
            output = "TP;{'AAPL': 0.0}!"

        return output

    backtester.test(simple, 'simple', '2016-01-01', '2021-01-01', info)
    `

const pair_trading = `
import backtester_package.backtester as backtester
import pandas

backtester.import_price_history('List of commodity ETFs_history')

def bollinger_bands(series, window, std):
    avg = series.rolling(window).mean()
    dev = series.rolling(window).std()
    return avg + dev * std, avg - dev * std


def get_pair_strategy(symbol1, symbol2, entry_std, exit_std, lookback_window, spread_window, max_mult=float('inf')):
    price_history = backtester.price_history
    price1 = price_history[symbol1]
    price2 = price_history[symbol2]
    series1 = pandas.Series(price1)
    series2 = pandas.Series(price2)
    alpha = None
    spread = None
    entry_bands = None
    exit_bands = None
    holding = False
    direction = None

    alpha = 2.42  # mean1 / mean2
    spread = series1 - alpha * series2
    entry_bands = bollinger_bands(spread, lookback_window, entry_std)
    exit_bands = bollinger_bands(spread, lookback_window, exit_std)

    multiplier = 0

    def strategy():
        nonlocal alpha
        nonlocal spread
        nonlocal entry_bands
        nonlocal exit_bands
        nonlocal holding
        nonlocal direction
        nonlocal multiplier
        date = backtester.datetime
        if alpha is None:  # experiment with dynamic values
            index1 = series1.index.get_loc(date)
            index2 = series2.index.get_loc(date)
            mean1 = series1.iloc[index1 - spread_window: index1 + 1].mean()
            mean2 = series2.iloc[index2 - spread_window: index2 + 1].mean()
            alpha = 2.42  # mean1 / mean2
            spread = series1 - alpha * series2
            entry_bands = bollinger_bands(spread, lookback_window, entry_std)
            exit_bands = bollinger_bands(spread, lookback_window, exit_std)

        output = ""
        quantity = backtester.portfolio.value() / (price1[date] + alpha * price2[date])

        upper, lower = entry_bands
        if multiplier < max_mult:
            if spread[date] < lower[date]:
                multiplier += 1
                output = "O;{s1};L;{q1}!O;{s2};S;{q2}!". \
                    format(s1=symbol1, s2=symbol2, q1=str(quantity), q2=str(quantity * alpha))
                direction = 'low'
                print('long open ' + date)
                print('Spread: ' + str(spread[date]))
            elif spread[date] > upper[date]:
                multiplier += 1
                output = "O;{s1};S;{q1}!O;{s2};L;{q2}!". \
                    format(s1=symbol1, s2=symbol2, q1=str(quantity), q2=str(quantity * alpha))
                direction = 'high'
                print('short open ' + date)
                print('Spread: ' + str(spread[date]))

        if multiplier > 0:
            upper, lower = exit_bands
            if direction == 'low' and lower[date] < spread[date]:
                output = "TQ;{{'{s1}': 0.0, '{s2}': 0.0}}!".format(s1=symbol1, s2=symbol2)
                multiplier = 0
                print('long close ' + date)
                print('Spread: ' + str(spread[date]))

            elif direction == 'high' and spread[date] < upper[date]:
                output = "TQ;{{'{s1}': 0.0, '{s2}': 0.0}}!".format(s1=symbol1, s2=symbol2)
                multiplier = 0
                print('short close ' + date)
                print('Spread: ' + str(spread[date]))

        return output

    return strategy, spread, entry_bands, exit_bands

strategy, spread, entry, exit = get_pair_strategy('CORN', 'WEAT', 1.5, 0, 10, 300, 1)

def run(info):
    backtester.test(strategy, 'pair_trading', '2016-01-01', '2021-01-01', info)
`

function Window (props) {
  return <div>
  <div className='Header'>
    {props.header}
    </div>

    <div className='Body'>
    {props.body}
    </div>
  </div>
}

const buttonStyle = {
    position: "absolute",
    zIndex: 2,
    bottom: 0,
    right: 20,
    backgroundColor: "lavender"
}

const buttonStyle1 = {
  position: "absolute",
  zIndex: 2,
  bottom: 0,
  right: 60,
  backgroundColor: "lavender"
}


class SubmitButton extends React.Component{
constructor(props) {
  super(props);
}

  submitCode() {
    console.log("button clicked!")
    fetch('https://backtesterwebbackend.herokuapp.com/submission', {
      method: 'POST',
      body:JSON.stringify({'body': this.props.body}),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
  }

  render () {
    return (
        <button onClick={() => this.submitCode()} style={buttonStyle1}>
            submit
        </button>
    )
  }
}

class TestButton extends React.Component{
  constructor(props) {
    super(props);
  }
  
    test() {
      console.log("button clicked!")
      fetch('https://backtesterwebbackend.herokuapp.com/test', {
        method: 'POST',
        body:JSON.stringify({'body': this.props.body}),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
    }
  
    render () {
      return (
          <button onClick={() => this.test()} style={buttonStyle}>
              test
          </button>
      )
    }
  }

class Display extends React.Component {
  constructor(props) {
    super(props)
    this.state = {editorValue: "", submitted: false, values: [], dates: [], name:'empty'}
    this.updateEditor = this.updateEditor.bind(this)
    this.updateValues = this.updateValues.bind(this)
    this.updateDates = this.updateDates.bind(this)
    this.updateName = this.updateName.bind(this)
  }

  componentDidMount() {
    this.values = setInterval(
      () => this.updateValues(),
      10000
    );

    this.dates = setInterval(
      () => this.updateDates(),
      10000
    );

    this.name = setInterval(
      () => this.updateName(),
      10000
    );
  }

  componentWillUnmount() {
    clearInterval(this.values);
    clearInterval(this.dates);
    clearInterval(this.name);
  }

  updateName() {
    fetch('https://backtesterwebbackend.herokuapp.com/name')
        .then(response => response.json())
        .then(data => this.setState({ name: data }));
  }

  updateValues() {
    fetch('https://backtesterwebbackend.herokuapp.com/values')
        .then(response => response.json())
        .then(data => this.setState({ values: data }));
  }

  updateDates() {
    fetch('https://backtesterwebbackend.herokuapp.com/dates')
        .then(response => response.json())
        .then(data => this.setState({ dates: data }));
  }

  updateEditor(value, event) {
    this.setState({editorValue: value})
  }

  render() {
    return <div>
        <div className="LeftPane"> 
          <Tabs defaultActiveKey="build" className="mb-3">
              <TabList>
                <Tab>Build</Tab>
                <Tab>Examples</Tab>
                <Tab>Help</Tab>
              </TabList>
                <TabPanel>
               <Editor
                      height="90vh"
                      defaultLanguage="python"
                      value = {starterCode}
                      onChange={this.updateEditor}
                      onClick={this.updateEditor}
                      />
                      <SubmitButton body = {this.state.editorValue}/>
                      <TestButton/>
                </TabPanel>
                <TabPanel>
                  <Tabs>
                  <TabList>
                    <Tab>moving_cross</Tab>
                    <Tab>pair_trading</Tab>
                  </TabList>

                <TabPanel>
                <Editor
                      height="90vh"
                      defaultLanguage="python"
                      value = {starterCode}
                      onMount={this.updateEditor}
                      onChange={this.updateEditor}
                      onClick={this.updateEditor}
                      />
                      <SubmitButton body = {this.state.editorValue}/>
                      <TestButton/>
                </TabPanel>

                <TabPanel>
                <Editor
                      height="90vh"
                      defaultLanguage="python"
                      value = {pair_trading}
                      onChange={this.updateEditor}
                      onClick={this.updateEditor}
                      />
                      <SubmitButton body = {this.state.editorValue}/>
                      <TestButton/>
                </TabPanel>

                  </Tabs>
                </TabPanel>
                <TabPanel>
                <div className="Text">
                <h1> Use Overview: </h1>
                <div className="Text">
                <b>import backtester.py</b> 
                <p></p>
                <b>{'\n'}import price histories</b> <p>(eg. backtester.import_price_history("sp500_history"))</p>
                <b>Create a function [run] </b> <p> (parameters: dict) The backend will execute this function upon testing.</p>
                <b>Create a strategy function </b> <p>(parameters: none, output: string). This function will be called at every timestep in the backtest, 
                  and should output a string, containing directives to alter the trader's portfolio. The timestep at which this function is being called
                  can be accessed by the varaible backtester.datetime</p>
                  
                <b>Directives:</b> <p>"TP;{'{'}[SYMBOL]: [VALUE]{'}'}" - (target percent), set the number of shares of [SYMBOL] to ([VALUE]*100)% of total portfolio value. </p>
                <p>"TQ;{'{'}[SYMBOL]: [VALUE]{'}'}" - (target quantity), set the number of shares of [SYMBOL] to [VALUE] shares. </p>
                <p>"O;{'{'}[SYMBOL]: [VALUE]{'}'}" - (order), increase the number of shares held of [SYMBOL] by [VALUE] shares. </p>
                <p>"CO;{'{'}[SYMBOL]: [VALUE]{'}'}" - (close order), decrease the number of shares held of [SYMBOL] by [VALUE] shares. </p>

                <p>Directives can be chained together, separated by semicolons. Every output string should be punctuated by a "!", 
                  which serves as a string terminator. For examples, please refer to the Examples tab.</p>

                <b>Within run, call backtester.test(strategy, test_name, start_date, end_date, info)</b> <p>where [strategy] is the function provided by the user.</p>
                </div>
                </div>
                </TabPanel>
          </Tabs>
        </div>
        <div className="RightPane">
          <div className="WindowTopRight">
          <Tabs className="mb-3">
            <TabList>
                <Tab>Log</Tab>
                <Tab>Daily returns</Tab>
                <Tab>Values</Tab>
                <Tab>Sharpe</Tab>
            </TabList>
        
            <TabPanel>
              <div className="Pane">
              <LazyLog stream="true" url="https://backtesterwebbackend.herokuapp.com/log"/>
              </div>
            </TabPanel>

            <TabPanel>
            <div className="Pane">
                <LazyLog url="https://backtesterwebbackend.herokuapp.com/returns"/>
              </div>
            </TabPanel>

            <TabPanel>
            <div className="Pane">
                <LazyLog url="https://backtesterwebbackend.herokuapp.com/formattedvalues"/>
              </div>
            </TabPanel>

            <TabPanel>
            <div className="Pane">
                <LazyLog url="https://backtesterwebbackend.herokuapp.com/sharpe"/>
              </div>
            </TabPanel>

          </Tabs>
          </div>

          <div className="WindowBottomRight">
          <Window
          header={<text>Plot: </text>}
          body = {
            
              <Plot
                data = {[{
                  type: 'line',
                  x: this.state.dates,
                  y: this.state.values,
                  marker: {
                    color: 'purple'
                  }
                }]}
              />
          }
          />
          </div>
        </div>
      </div>
  }
}

function App (){
  return (
    <div className='Display'>
        <Display/>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App