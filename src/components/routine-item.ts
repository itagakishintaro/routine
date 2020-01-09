import { LitElement, html, css, customElement, property } from "lit-element";

import { connect } from "pwa-helpers/connect-mixin.js";

// This element is connected to the Redux store.
import { store } from "../store.js";

// These are the actions needed by this element.
import { navigate } from "../actions/app.js";
import { setCurrent } from "../actions/routines";

// We are lazy loading its reducer.
import user from "../reducers/user.js";
import routines from "../reducers/routines";
store.addReducers({
  user,
  routines
});

// These are the shared styles needed by this element.
import { SharedStyles } from "./shared-styles.js";

// Firebase
import firebase from "../utils/firebase.js";

// compornents
import "../utils/loading-image.js";
import "./routine-header.js";
import "./routine-figures.js";
import "@polymer/iron-collapse/iron-collapse.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-dialog/paper-dialog.js";
import "@polymer/iron-icons/iron-icons.js";
import "@polymer/paper-icon-button/paper-icon-button.js";

@customElement("routine-item")
export class RoutineItem extends connect(store)(LitElement) {
  @property({ type: String })
  private loadingDisplay = "none";

  @property({ type: Object })
  private user = {};

  @property({ type: Object })
  private routine = {};

  @property({ type: Boolean })
  private opened = false;

  static get styles() {
    return [
      SharedStyles,
      css`
        .modal {
          position: fixed;
          top: 5vh;
          left: 5vw;
          width: 90vw;
          max-width: 90vw;
          height: 90vh;
          overflow: auto;
          margin: 0;
        }

        .card {
          display: block;
          margin: 0 0 20px;
          border-top: 6px solid var(--app-primary-color);
        }

        .button-wrapper {
          display: flex;
          justify-content: space-around;
          margin: 2em 0 0;
        }
        paper-icon-button {
          display: block;
          width: 80px;
          height: 80px;
        }

        .card-header {
          margin: 0;
          padding: 0.5em 1em;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .toggle-icon {
          box-sizing: content-box;
          width: 2em;
          height: 2em;
          color: var(--app-drawer-selected-color);
          margin: 0;
          padding: 0;
        }
        .history-header {
          margin: 1em 0 0 0;
          border-bottom: 1px solid #eee;
        }
        .history {
          list-style: none;
          margin: 0;
          padding: 0;
          height: 5em;
          overflow-y: hidden;
        }
        .history-item {
          border-bottom: 1px solid #eee;
        }
        .history-more {
          text-align: center;
          margin: 1em 0;
          font-size: var(--app-small-text-size);
          color: var(--app-drawer-selected-color);
        }
      `
    ];
  }

  protected render() {
    return html`
      <paper-card class="card">
        <div class="card-header" @click="${this.toggleCollapse}">
          <routine-header .routine="${this.routine}"></routine-header>
          <div>
            ${
              this.opened
                ? html`
                    <paper-icon-button
                      class="toggle-icon"
                      icon="expand-less"
                    ></paper-icon-button>
                  `
                : html`
                    <paper-icon-button
                      class="toggle-icon"
                      icon="expand-more"
                    ></paper-icon-button>
                  `
            }
          </div>
        </div>
        <div class="card-content">
          <routine-figures .routine="${this.routine}"></routine-figures>

          <iron-collapse id="collapse" opend="false">
            <div class="button-wrapper">
              <paper-icon-button icon="check-circle" title="チェック" @click="${
                this.record
              }">Record</paper-icon-button>
              <paper-icon-button icon="date-range" title="カレンダー登録" @click="${
                this.openCalendar
              }">Calendar</paper-icon-button>
              <paper-icon-button icon="settings" title="設定" @click="${
                this.openSetting
              }">Setting</paper-icon-button>
            </div>
            <div class="history-header">履歴</div>
            <ul class="history">
              ${Object.keys(this.routine.records).map(
                datetime => html`
                  <li class="history-item">
                    ${moment(datetime).format("YYYY/MM/DD")}
                  </li>
                `
              )}
            </ul>
            <div class="history-more" @click="${
              this.moveToHistory
            }">もっと見る</div>
          </iron-collapse>
        </div>
      </paper-card>

      <paper-dialog id="modalCalendar" class="modal" modal>
        <input id="datetime" type="datetime-local" value="${moment().format(
          "YYYY-MM-DD" + "T00:00"
        )}"></input>
        <button @click="${this.recordWithDatetime}">完了</button>
        <button @click="${this.closeCalendar}">キャンセル</button>
      </paper-dialog>

      <paper-dialog id="modalSetting" class="modal" modal>
        <routine-register .routine="${this.routine}"></routine-register>
      </paper-dialog>

      <loading-image loadingDisplay="${this.loadingDisplay}"></loading-image>
    `;
  }

  constructor() {
    super();
  }

  // This is called every time something is updated in the store.
  stateChanged(state: RootState) {
    this.user = state.user;
    console.log(state);

    if (this.shadowRoot.getElementById("modalSetting")) {
      this.shadowRoot.getElementById("modalSetting").close();
    }
  }

  private toggleCollapse() {
    this.opened = !this.opened;
    this.shadowRoot.getElementById("collapse").toggle();
  }

  private record() {
    const datetime = moment().format();
    this.recordToFirebase(datetime);
  }

  private recordWithDatetime() {
    const datetime = moment(
      this.shadowRoot.getElementById("datetime").value
    ).format();
    this.recordToFirebase(datetime);
    this.closeCalendar();
  }

  private recordToFirebase(datetime) {
    firebase
      .firestore()
      .collection("users")
      .doc(this.user.uid)
      .collection("routines")
      .doc(this.routine.id)
      .set({ records: { [datetime]: true } }, { merge: true });
  }

  private openCalendar() {
    this.shadowRoot.getElementById("modalCalendar").open();
  }

  private closeCalendar() {
    this.shadowRoot.getElementById("modalCalendar").close();
  }

  private openSetting() {
    this.shadowRoot.getElementById("modalSetting").open();
  }

  private moveToHistory() {
    store.dispatch(setCurrent(this.routine));
    store.dispatch(navigate("/history"));
  }
}
