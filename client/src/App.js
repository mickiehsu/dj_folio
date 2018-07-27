import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

const axios = require('axios');
const API = '/';

class App extends Component {
  constructor (props) {
    super(props)

    this.state = {
      data: null,
    };
  }
  
  componentDidMount() {
    axios.get(API)
    .then(function (response) {
      // handle success
      console.log(response);
    })
  }

  render() {
    console.log(this.state.data);
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          { this.state.data }
        </p>
      </div>
    );
  }
}

export default App;
