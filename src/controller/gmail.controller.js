/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getUUID, mapError} from '../lib/util';
import * as l10n from '../lib/l10n';
import * as gmail from '../modules/gmail';
import {SubController} from './sub.controller';
import {formatEmailAddress} from '../modules/key';
import {setAppDataSlot} from '../controller/sub.controller';
import {prefs} from '../modules/prefs';

export default class GmailController extends SubController {
  constructor(port) {
    super(port);
    this.state = {
      userInfo: null,
      threadId: null
    };
    this.peerType = 'gmailController';
    this.authorizationRequest = null;
    this.autoSendTimer = null;
    this.autoSendCancelled = false;
    // register event handlers
    this.on('open-editor', this.onOpenEditor);
    this.on('secure-button', this.onSecureBtn);
    this.on('cancel-auto-send', this.onCancelAutoSend);
  }

  activateComponent() {
    mvelo.tabs.activate({id: this.tabId});
  }

  async onOpenEditor(options) {
    await this.createPeer('editorController');
    if (await this.peers.editorController.getPopup()) {
      await this.peers.editorController.activateComponent();
      return;
    }
    options.recipientsTo ||= [];
    options.recipientsCc ||= [];
    this.openEditor(options);
  }

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} options.text   The plaintext input to encrypt
   */
  openEditor(options) {
    this.setState({userInfo: options.userInfo, threadId: options.threadId});
    this.peers.editorController.openEditor({
      integration: true,
      predefinedText: options.text,
      quotedMail: options.quotedMail,
      quotedMailIndent: options.quotedMailIndent === undefined ? true : options.quotedMailIndent,
      quotedMailHeader: options.quotedMailHeader,
      subject: options.subject,
      recipients: {
        to: options.recipientsTo.map(email => ({email})),
        cc: options.recipientsCc.map(email => ({email}))
      },
      userInfo: options.userInfo,
      attachments: options.attachments,
      keepAttachments: options.keepAttachments
    });
  }

  async encryptedMessage({armored, encFiles, subject, to, cc}) {
    const userEmail = this.state.userInfo.email;
    const toFormatted = to.map(({name, email}) => formatEmailAddress(email, name));
    const ccFormatted = cc.map(({name, email}) => formatEmailAddress(email, name));
    const mail = gmail.buildMail({message: armored, attachments: encFiles, subject, sender: userEmail, to: toFormatted, cc: ccFormatted});
    const accessToken = await this.peers.editorController.getAccessToken();
    const sendOptions = {
      email: userEmail,
      message: mail,
      accessToken
    };
    if (this.state.threadId) {
      sendOptions.threadId = this.state.threadId;
    }

    // Check if auto-send is enabled
    if (prefs.general.auto_send_msg) {
      const delay = prefs.general.auto_send_delay || 5;
      this.autoSendCancelled = false;

      // Show countdown notification
      for (let remaining = delay; remaining > 0; remaining--) {
        this.peers.editorController.ports.editor.emit('show-notification', {
          message: l10n.get('gmail_integration_auto_send_countdown', [remaining.toString()]),
          type: 'info',
          autoHide: false,
          dismissable: true,
          showCancelButton: true
        });

        await new Promise((resolve, reject) => {
          this.autoSendTimer = setTimeout(() => {
            this.autoSendTimer = null;
            if (this.autoSendCancelled) {
              reject(new Error('cancelled'));
            } else {
              resolve();
            }
          }, 1000);
        }).catch(() => {
          this.showCancelledNotification();
          throw new Error('cancelled');
        });
      }

      // Check one more time after countdown completes
      if (this.autoSendCancelled) {
        this.showCancelledNotification();
        return;
      }
    }

    // send email via GMAIL api
    this.peers.editorController.ports.editor.emit('send-mail-in-progress');
    try {
      await gmail.sendMessageMeta(sendOptions);
      this.peers.editorController.ports.editor.emit('show-notification', {
        message: l10n.get('gmail_integration_sent_success'),
        type: 'success',
        autoHide: true,
        hideDelay: 2000,
        closeOnHide: true,
        dismissable: false
      });
    } catch (error) {
      this.peers.editorController.ports.editor.emit('error-message', {
        error: Object.assign(mapError(error), {
          autoHide: false,
          dismissable: true
        })
      });
    }
    await this.removePeer('editorController');
  }

  showCancelledNotification() {
    this.peers.editorController.ports.editor.emit('show-notification', {
      message: l10n.get('gmail_integration_send_cancelled'),
      type: 'info',
      autoHide: true,
      hideDelay: 2000,
      closeOnHide: true,
      dismissable: false
    });
  }

  onCancelAutoSend() {
    this.autoSendCancelled = true;
    if (this.autoSendTimer) {
      clearTimeout(this.autoSendTimer);
      this.autoSendTimer = null;
    }
  }

  async encryptError(error) {
    if (error.code == 'EDITOR_DIALOG_CANCEL') {
      await this.removePeer('editorController');
      return;
    }
    this.peers.editorController.ports.editor.emit('error-message', {
      error: Object.assign(mapError(error), {
        autoHide: false,
        dismissable: false
      })
    });
  }

  async onSecureBtn({type, msgId, all, userInfo}) {
    try {
      const accessToken = await this.getAccessToken(userInfo);
      const userEmail = userInfo.email;
      const {threadId, internalDate, payload} = await gmail.getMessage({msgId, email: userEmail, accessToken});
      const messageText = await gmail.extractMailBody({payload, userEmail, msgId, accessToken});
      let subject = gmail.extractMailHeader(payload, 'Subject');
      const {email: sender, name: senderName} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From'));

      const recipientsTo = [];
      const recipientsCc = [];
      const to = gmail.extractMailHeader(payload, 'To');
      const cc = gmail.extractMailHeader(payload, 'Cc');
      let attachments = [];
      let quotedMailHeader;
      if (type === 'reply') {
        subject = `Re: ${subject}`;
        recipientsTo.push(sender);
        if (all) {
          to.split(',').map(address => gmail.parseEmailAddress(address)['email']).filter(email => email !== '' && email !== sender && email !== userEmail).forEach(email => recipientsTo.push(email));
          if (cc) {
            cc.split(',').map(address => gmail.parseEmailAddress(address)['email']).filter(email => email !== '' && email !== sender && email !== userEmail).forEach(email => recipientsCc.push(email));
          }
        }
        quotedMailHeader = l10n.get('gmail_integration_quoted_mail_header_reply', [l10n.localizeDateTime(new Date(parseInt(internalDate, 10)), {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}), `${senderName} <${sender}>`.trim()]);
      } else {
        subject = `Fwd: ${subject}`;
        quotedMailHeader = l10n.get('gmail_integration_quoted_mail_header_forward', [`${senderName} <${sender}>`.trim(), l10n.localizeDateTime(new Date(parseInt(internalDate, 10)), {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}), subject, to.split(',').map(address => `${gmail.parseEmailAddress(address)['name']} <${gmail.parseEmailAddress(address)['email']}>`.trim()).join(', ')]);
        if (cc) {
          quotedMailHeader += `\n${l10n.get('editor_label_copy_recipient')}: ${cc.split(',').map(address => `${gmail.parseEmailAddress(address)['name']} <${gmail.parseEmailAddress(address)['email']}>`.trim()).join(', ')}`;
        }
        quotedMailHeader += '\n';
        attachments = await gmail.getMailAttachments({payload, userEmail, msgId, accessToken});
      }
      const options = {
        userInfo,
        subject,
        recipientsTo,
        recipientsCc,
        threadId,
        quotedMailHeader,
        quotedMail: messageText || '',
        quotedMailIndent: type === 'reply',
        attachments,
        keepAttachments: type !== 'reply'
      };
      this.onOpenEditor(options);
    } catch (error) {
      console.log(`Gmail API error: ${error.message}`);
    }
  }

  /**
   * Get access token
   * @param  {String} email
   * @param  {Array}  scopes
   * @param  {Function} beforeAuth - called before new authorization request is started
   * @param  {Function} afterAuth - called after successful authorization request
   * @return {String}
   */
  async getAccessToken({email, legacyGsuite, scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND], beforeAuth, afterAuth} = {}) {
    const accessToken = await this.checkAuthorization({email, scopes});
    if (accessToken) {
      await this.checkLicense({email, legacyGsuite});
      return accessToken;
    }
    if (beforeAuth) {
      beforeAuth();
    }
    this.openAuthorizeDialog({email, legacyGsuite, scopes});
    return new Promise((resolve, reject) => this.authorizationRequest = {resolve, reject, afterAuth});
  }

  async onAuthorize({email, legacyGsuite, scopes}) {
    try {
      const accessToken = await gmail.authorize(email, legacyGsuite, scopes);
      await this.checkLicense({email, legacyGsuite});
      this.activateComponent();
      if (this.authorizationRequest.afterAuth) {
        this.authorizationRequest.afterAuth();
      }
      this.authorizationRequest.resolve(accessToken);
    } catch (e) {
      this.authorizationRequest.reject(e);
      throw e;
    }
  }

  checkAuthorization({email, scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND]}) {
    return gmail.getAccessToken({email, scopes});
  }

  async checkLicense(userInfo) {
    try {
      await gmail.checkLicense(userInfo);
    } catch (e) {
      const slotId = getUUID();
      setAppDataSlot(slotId, {email: userInfo.email});
      await mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/provider/license`);
      throw e;
    }
  }

  async openAuthorizeDialog({email, legacyGsuite, scopes}) {
    const activeTab = await mvelo.tabs.getActive();
    if (activeTab) {
      this.tabId = activeTab.id;
    }
    const slotId = getUUID();
    setAppDataSlot(slotId, {email, legacyGsuite, scopes, gmailCtrlId: this.id});
    await mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/provider/auth`);
  }
}
