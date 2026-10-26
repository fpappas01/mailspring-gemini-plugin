const { React, PropTypes, Actions } = require('mailspring-exports');
const {
  processEmailWithGemini,
  processCustomInstruction,
  getStoredApiKey,
  saveStoredApiKey,
} = require('./gemini-service');

const h = React.createElement;

const MENU_ITEMS = [
  { key: 'proofread', label: 'Proofread & Fix Grammar' },
  { key: 'formal', label: 'Formal Business Tone' },
  { key: 'concise', label: 'Make Concise' },
  { divider: true },
  { key: 'translate_en', label: 'Translate to English' },
  { key: 'translate_el', label: 'Translate to Greek' },
  { divider: true },
  { key: 'configure_key', label: 'Configure API Key' },
];

class GeminiPopoverMenu extends React.Component {
  constructor(props) {
    super(props);
    const existingKey = getStoredApiKey();
    this.state = {
      showKeyInput: false,
      showCustomInput: false,
      inputKeyVal: existingKey,
      customPrompt: '',
    };
    this._popoverRef = React.createRef();
    this._onDocumentMouseDown = this._onDocumentMouseDown.bind(this);
    this._onDocumentKeyDown = this._onDocumentKeyDown.bind(this);
  }

  componentDidMount() {
    const existingKey = getStoredApiKey();
    this.setState({ inputKeyVal: existingKey });
    document.addEventListener('mousedown', this._onDocumentMouseDown, true);
    document.addEventListener('keydown', this._onDocumentKeyDown, true);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this._onDocumentMouseDown, true);
    document.removeEventListener('keydown', this._onDocumentKeyDown, true);
    if (this.props.onClose) {
      this.props.onClose();
    }
  }

  _onDocumentMouseDown(e) {
    const popoverEl = this._popoverRef.current;
    const buttonEl = this.props.buttonEl;
    if (popoverEl && popoverEl.contains(e.target)) {
      return;
    }
    if (buttonEl && buttonEl.contains(e.target)) {
      return;
    }
    Actions.closePopover();
  }

  _onDocumentKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      Actions.closePopover();
    }
  }

  _saveKey() {
    const trimmed = (this.state.inputKeyVal || '').trim();
    if (!trimmed) return;
    saveStoredApiKey(trimmed);
    Actions.closePopover();
    AppEnv.showErrorDialog({
      title: 'Gemini Assistant',
      message: 'API Key saved successfully.',
    });
  }

  _submitCustomInstruction() {
    const promptText = (this.state.customPrompt || '').trim();
    if (!promptText) return;
    Actions.closePopover();
    this.props.onSubmitCustom(promptText);
  }

  _renderKeyInputPanel() {
    return h(
      'div',
      { className: 'gemini-menu-panel' },
      h('div', { className: 'gemini-menu-panel-header' }, 'Gemini API Key (Google AI Studio):'),
      h('input', {
        type: 'password',
        className: 'gemini-menu-input',
        placeholder: 'Paste your API Key here...',
        value: this.state.inputKeyVal,
        autoFocus: true,
        onChange: (e) => this.setState({ inputKeyVal: e.target.value }),
        onKeyDown: (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this._saveKey();
          } else if (e.key === 'Escape') {
            Actions.closePopover();
          }
          e.stopPropagation();
        },
      }),
      h(
        'div',
        { className: 'gemini-menu-panel-actions' },
        h(
          'button',
          {
            className: 'btn btn-emphasis',
            disabled: !(this.state.inputKeyVal || '').trim(),
            onClick: () => this._saveKey(),
          },
          'Save'
        ),
        h(
          'button',
          {
            className: 'btn',
            onClick: () => this.setState({ showKeyInput: false }),
          },
          'Back'
        )
      )
    );
  }

  _renderCustomInputPanel() {
    return h(
      'div',
      { className: 'gemini-menu-panel' },
      h('div', { className: 'gemini-menu-panel-header' }, 'Custom Instruction:'),
      h('textarea', {
        className: 'gemini-menu-textarea',
        placeholder: 'e.g. Reply politely stating that I am available for a call on Friday at 11:00 AM',
        value: this.state.customPrompt,
        rows: 3,
        autoFocus: true,
        onChange: (e) => this.setState({ customPrompt: e.target.value }),
        onKeyDown: (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this._submitCustomInstruction();
          } else if (e.key === 'Escape') {
            Actions.closePopover();
          }
          e.stopPropagation();
        },
      }),
      h('div', { className: 'gemini-menu-panel-hint' }, 'Ctrl+Enter to submit'),
      h(
        'div',
        { className: 'gemini-menu-panel-actions' },
        h(
          'button',
          {
            className: 'btn btn-emphasis',
            disabled: !(this.state.customPrompt || '').trim(),
            onClick: () => this._submitCustomInstruction(),
          },
          'Generate'
        ),
        h(
          'button',
          {
            className: 'btn',
            onClick: () => this.setState({ showCustomInput: false, customPrompt: '' }),
          },
          'Back'
        )
      )
    );
  }

  _renderMenuItems() {
    return h(
      'div',
      { className: 'gemini-menu-list' },
      h(
        'div',
        {
          key: 'custom_instruction',
          className: 'gemini-menu-item',
          onClick: () => this.setState({ showCustomInput: true, showKeyInput: false }),
        },
        'Custom Instruction...'
      ),
      h('hr', { key: 'div-custom', className: 'gemini-menu-divider' }),
      MENU_ITEMS.map((item, idx) =>
        item.divider
          ? h('hr', { key: `div-${idx}`, className: 'gemini-menu-divider' })
          : h(
              'div',
              {
                key: item.key,
                className: 'gemini-menu-item',
                onClick: () => {
                  if (item.key === 'configure_key') {
                    this.setState({
                      showKeyInput: true,
                      showCustomInput: false,
                      inputKeyVal: getStoredApiKey(),
                    });
                  } else {
                    Actions.closePopover();
                    this.props.onSelectAction(item.key);
                  }
                },
              },
              item.label
            )
      )
    );
  }

  render() {
    let content;
    if (this.state.showKeyInput) {
      content = this._renderKeyInputPanel();
    } else if (this.state.showCustomInput) {
      content = this._renderCustomInputPanel();
    } else {
      content = this._renderMenuItems();
    }

    return h(
      'div',
      {
        ref: this._popoverRef,
        className: 'gemini-popover-container',
        onClick: (e) => e.stopPropagation(),
      },
      content
    );
  }
}

class GeminiComposerButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      popoverOpen: false,
    };
    this._wrapperRef = React.createRef();
    this._buttonRef = React.createRef();
    this._onClickButton = this._onClickButton.bind(this);
    this._handleAction = this._handleAction.bind(this);
    this._handleCustomInstruction = this._handleCustomInstruction.bind(this);
  }

  componentDidMount() {
    getStoredApiKey();
    this._applyToolbarPositioning();
  }

  _applyToolbarPositioning() {
    const wrapperEl = this._wrapperRef.current;
    if (!wrapperEl) return;
    const parentEl = wrapperEl.parentElement;
    if (parentEl && parentEl.classList && parentEl.classList.contains('composer-action-bar-content')) {
      wrapperEl.style.order = '50';
      wrapperEl.style.margin = '0 8px';
    }
  }

  _onClickButton(e) {
    e.stopPropagation();
    if (this.state.loading) return;

    if (this.state.popoverOpen) {
      Actions.closePopover();
      this.setState({ popoverOpen: false });
      return;
    }

    const buttonEl = this._buttonRef.current || e.currentTarget;
    const buttonRect = buttonEl.getBoundingClientRect();

    this.setState({ popoverOpen: true });

    Actions.openPopover(
      h(GeminiPopoverMenu, {
        buttonEl: buttonEl,
        onSelectAction: this._handleAction,
        onSubmitCustom: this._handleCustomInstruction,
        onClose: () => this.setState({ popoverOpen: false }),
      }),
      {
        originRect: buttonRect,
        direction: 'up',
        closeOnAppBlur: true,
      }
    );
  }

  async _handleCustomInstruction(customPrompt) {
    const { draft, session } = this.props;
    this.setState({ loading: true });

    try {
      const liveDraft = session && typeof session.draft === 'function' ? session.draft() : draft;
      const currentBody = liveDraft && liveDraft.body ? liveDraft.body : '';

      const updatedHtml = await processCustomInstruction(currentBody, customPrompt);
      session.changes.add({ body: updatedHtml });
      session.changes.commit();
    } catch (error) {
      AppEnv.showErrorDialog({
        title: 'Gemini Assistant Error',
        message: error.message,
      });
    } finally {
      this.setState({ loading: false });
    }
  }

  async _handleAction(taskKey) {
    this.setState({ loading: true });
    const { draft, session } = this.props;

    try {
      const liveDraft = session && typeof session.draft === 'function' ? session.draft() : draft;
      const currentBody = liveDraft ? liveDraft.body : '';

      if (!currentBody || currentBody.trim() === '') {
        AppEnv.showErrorDialog({
          title: 'Empty Email',
          message: 'Please write a draft in your email first so Gemini can process it.',
        });
        this.setState({ loading: false });
        return;
      }

      const updatedHtml = await processEmailWithGemini(currentBody, taskKey);
      session.changes.add({ body: updatedHtml });
      session.changes.commit();
    } catch (error) {
      AppEnv.showErrorDialog({
        title: 'Gemini Assistant Error',
        message: error.message,
      });
    } finally {
      this.setState({ loading: false });
    }
  }

  render() {
    const { loading } = this.state;

    return h(
      'div',
      {
        ref: this._wrapperRef,
        className: 'gemini-composer-wrapper',
      },
      h(
        'button',
        {
          ref: this._buttonRef,
          className: `btn btn-toolbar gemini-btn ${loading ? 'is-loading' : ''}`,
          onClick: this._onClickButton,
          title: 'Edit with Google Gemini AI',
          disabled: loading,
        },
        loading ? 'Processing...' : '\u2728 Gemini AI'
      )
    );
  }
}

GeminiComposerButton.displayName = 'GeminiComposerButton';
GeminiComposerButton.propTypes = {
  draft: PropTypes.object.isRequired,
  session: PropTypes.object.isRequired,
};

module.exports = GeminiComposerButton;