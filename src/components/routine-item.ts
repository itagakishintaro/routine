import { LitElement, html, css, customElement, property } from 'lit-element';

import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

// These are the actions needed by this element.
import { navigate } from '../actions/app.js';
import { setTargetRoutine } from '../actions/setting.js';

// We are lazy loading its reducer.
import user from '../reducers/user.js';
import setting from '../reducers/setting.js';
store.addReducers({
  user, setting
});

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

// Firebase
import firebase from "../utils/firebase.js";

// compornents
import '../utils/loading-image.js';
import '@polymer/iron-collapse/iron-collapse.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';

@customElement('routine-item')
export class RoutineItem extends connect(store)(LitElement) {
  @property({ type: String })
  private loadingDisplay = 'none';  

  @property({ type: Object })
  private user = {};

  @property({ type: Object })
  private routine = {};

  static get styles() {
    return [
      SharedStyles,
      css`
      `
    ];
  }

  protected render() {
    return html`
      <paper-card>
        <div class="card-content">
          <div @click="${ this.toggleCollapse }">${ this.routine.name }</div>
          <div>${ this.spanShortName(this.routine.span) } ${ this.routine.frequency }ペース</div>
          <iron-collapse id="collapse" opend="false">
            <button @click="${this.record}">Record</button>
            <button @click="${this.openCalendar}">Calendar</button>
            <button @click="${this.moveToSetting}">Setting</button>
          </iron-collapse>
          <div>${ this.fromLastDay(this.routine.records) }</div>
          <div>${ this.calcPace(this.routine) }</div>
        </div>
      </paper-card>

      <paper-dialog id="modal" class="modal" modal>
        <input id="datetime" type="datetime-local" value="${moment().format("YYYY-MM-DD" + "T00:00")}"></input>
        <button @click="${this.recordWithDatetime}">完了</button>
        <button @click="${this.closeCalendar}">キャンセル</button>
      </paper-dialog>
      <loading-image loadingDisplay="${this.loadingDisplay}"></loading-image>
    `
  }

  constructor() {
    super();
    
  }

  // This is called every time something is updated in the store.
  stateChanged(state: RootState) {
    this.user = state.user;
    console.log(state);
  }

  private spanShortName(span){
    switch(span){
      case 'day':
        return '日';
        break;
      case 'week':
        return '週';
        break;
      case 'month':
        return '月';
        break;
      case 'year':
        return '年';
        break;
      default:
        return '';
        break
    }
  }

  private fromLastDay(records){
    if(!records || !Object.keys(records)){
      return;
    }
    const lastDay = Object.keys(records).reduce( (pre, cur) => pre < cur? cur: pre, '' );
    return moment().diff(moment(lastDay), 'days');
  }

  private calcPace(r){
    if(!r || !r.records){
      return;
    }
    const firstDay = Object.keys(r.records).reduce( (pre, cur) => pre > cur? cur: pre, moment().format() );
    const fromFirstDay = moment().diff(moment(firstDay), 'days');
    const times = Object.keys(r.records).length;
    let span;
    switch(r.span){
      case 'day':
        span = 1;
        break;
      case 'week':
        span = 7;
        break;
      case 'month':
        span = 30;
        break;
      case 'year':
        span = 365;
        break;
      default:
        span = 1;
        break
    }
    return times / (fromFirstDay + 1) * span;
  }

  private toggleCollapse() {
    this.shadowRoot.getElementById('collapse').toggle();
  }

  private record(){
    const datetime = moment().format();
    this.recordToFirebase(datetime);
  }

  private recordWithDatetime(){
    const datetime = moment(this.shadowRoot.getElementById("datetime").value).format();
    this.recordToFirebase(datetime);
    this.shadowRoot.getElementById("modal").close();
  }

  private recordToFirebase(datetime){
    firebase.firestore()
      .collection('users')
      .doc(this.user.uid)
      .collection('routines')
      .doc(this.routine.id)
      .set( {records: {[datetime]: true} }, { merge: true } );
  }

  private openCalendar(){
    this.shadowRoot.getElementById("modal").open();
  }

  private closeCalendar(){
    this.shadowRoot.getElementById("modal").close();
  }

  private moveToSetting(){
    store.dispatch(setTargetRoutine(this.routine));
    store.dispatch(navigate("/setting"));
  }
}
