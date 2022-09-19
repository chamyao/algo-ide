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

import {LazyLog} from 'react-lazylog';

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

class SubmitButton extends React.Component{
constructor(props) {
  super(props);
}

  submitCode() {
    console.log("button clicked!")
    fetch('http://localhost:5000/submission', {
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
        <button onClick={() => this.submitCode()} style={buttonStyle}>
            test
        </button>
    )
  }
}

class Display extends React.Component {
  constructor(props) {
    super(props)
    this.state = {editorValue: "", submitted: false, values: []}
    this.updateEditor = this.updateEditor.bind(this)
    this.updateValues = this.updateValues.bind(this)
  }

  componentDidMount() {
    this.values = setInterval(
      () => this.updateValues(),
      1000
    );
  }

  componentWillUnmount() {
    clearInterval(this.values);
  }

  updateValues() {
    fetch('http://localhost:5000/values')
        .then(response => response.json())
        .then(data => this.setState({ values: data }));
  }

  updateEditor(value, event) {
    this.setState({editorValue: value})
  }

  render() {
    return <div>
        <div className="LeftPane"> 
          <Window
            header={<text>    editor </text>}
            body={<Editor
              height="90vh"
              defaultLanguage="python"
              value = {starterCode}
              onChange={this.updateEditor}
            />}
          />

          <SubmitButton
            body = {this.state.editorValue}
          />
        </div>
        <div className="RightPane">
          <div className="WindowTopRight">
          <Window
          header={<text>statistics</text>}
          body = {
            <LazyLog url="http://localhost:5000/info" />
          }
          />
          </div>

          <div className="WindowBottomRight">
          <Window
          header={<text>plots</text>}
          body = {
            <Plot
              data = {[{
                type: 'line',
                y: this.state.values
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
    <div>
      <p>algo-ide</p>
      <div className='Display'>
        <Display/>
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App