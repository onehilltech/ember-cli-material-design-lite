import Ember from 'ember';
import InputMixin from './input';

const VALIDATION_ERROR_TYPE = [
  'badInput',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'valueMissing',
  'typeMismatch',
];

export default Ember.Mixin.create (InputMixin, {
  mdl: Ember.inject.service (),

  classNames: ['mdl-textfield__input'],

  floatingLabel: true,

  didInsertElement () {
    this._super (...arguments);

    // Insert the wrapper element for the input.
    this.$ ().wrap (`<div class="mdl-textfield mdl-js-textfield"></div>`);
    let $wrapper = this.$().parent ();

    // Insert the label for the input.
    let labelText = this.getWithDefault ('label', '');

    let $label = Ember.$(`<label class="mdl-textfield__label" for="${this.elementId}">${labelText}</label>`);
    let $error = Ember.$('<span class="mdl-textfield__error"></span>');

    $label.insertAfter (this.$());
    $error.insertAfter ($label);

    this.setProperties ({$wrapper: $wrapper, $error: $error, $label: $label});

    this._toggleWrapperClassNames ();

    // Handle the error message.
    this.setErrorMessage (this.get ('errorMessage'));

    // Now, upgrade the wrapper element.
    this.get ('mdl').upgradeElement ($wrapper[0]);

    // If the element is required and the validity is value missing, then
    // we need to remove the is-invalid class from the element because input
    // has just been rendered. We should not worry about validity until the
    // input is dirty.
    if (this.element.required && this.element.validity.valueMissing) {
      $wrapper.removeClass ('is-invalid');
    }
  },

  didUpdateAttrs () {
    this._super (...arguments);
    this._toggleWrapperClassNames ();

    // Handle the error message.
    this.setErrorMessage (this.get ('errorMessage'));
  },

  willDestroyElement () {
    this._super (...arguments);

    // Downgrade the wrapper element, delete the label element and error,
    // then unwrap (or delete) the wrapper element.

    let {$wrapper, $error, $label} = this.getProperties ('$wrapper', '$label', '$error');
    this.get ('mdl').downgradeElements ($wrapper[0]);

    $label.remove ();
    $error.remove ();

    this.$().unwrap ();

    this.setProperties ({$wrapper: null, $label: null, $error: null});
  },

  _onBlur () {
    this._super (...arguments);

    // Set the current value as the new initial value.
    this.set ('_initValue', this.get ('value'));
  },

  isDirty: Ember.computed.not ('isClean'),
  isClean: Ember.computed.equal ('_initValue', 'value'),

  _toggleWrapperClassNames () {
    let $wrapper = this.get ('$wrapper');

    $wrapper.toggleClass ('is-disabled', this.getWithDefault ('disabled', false));
    $wrapper.toggleClass ('is-invalid', this.getWithDefault ('isInvalid', false));
    $wrapper.toggleClass ('is-focused', this.getWithDefault ('isFocused', false));
    $wrapper.toggleClass ('mdl-textfield--floating-label', this.getWithDefault ('floatingLabel', false));
    $wrapper.toggleClass ('mdl-textfield--align-right', this.getWithDefault ('alignRight', false));
    $wrapper.toggleClass ('mdl-textfield--full-width', this.getWithDefault ('fullWidth', false));
  },

  setErrorMessage (message) {
    let $wrapper = this.get ('$wrapper');

    if (Ember.isEmpty (message)) {
      // Make sure there is not custom error set for the input. This also
      // includes removing the invalid class from the wrapper.
      if (this.element.validity.customError) {
        this.element.setCustomValidity ('');
        this._showErrorMessage ('');

        $wrapper.toggleClass ('is-invalid', false);
      }
    }
    else {
      let typeOf = Ember.typeOf (message);

      if (typeOf === 'string') {
        // Update the custom error message.
        this.element.setCustomValidity (message);
        this._showErrorMessage (message);

        // Make sure the wrapper class has the invalid class.
        $wrapper.toggleClass ('is-invalid', true);
      }
      else if (Ember.isArray (message)) {
        this.setErrorMessage (message[0].message);
      }
      else if (typeOf === 'object') {
        this.setErrorMessage (message.message);
      }
    }
  },

  _showErrorMessage (message) {
    this.get ('$error').text (message);
    this.get ('$wrapper').toggleClass ('is-invalid', !Ember.isEmpty (message));
  },

  validateInput () {
    this._super (...arguments);

    if (this.element.validity.valid)
      return;

    let customError = this.get ('customError');

    if (Ember.isPresent (customError)) {
      // We are going to attempt to show a custom error message. This is only
      // possible if we have defined a error message that corresponds to the
      // failed validation type.

      for (let i = 0, len = VALIDATION_ERROR_TYPE.length; i < len; ++i) {
        const reason = VALIDATION_ERROR_TYPE[i];
        const failed = this.element.validity[reason];

        if (failed) {
          if (Ember.isPresent (customError[reason])) {
            this._showErrorMessage (customError[reason]);
          }
          else {
            this._showErrorMessage (this.element.validationMessage);
          }

          break;
        }
      }
    }
    else {
      this._showErrorMessage (this.element.validationMessage);
    }
  }
});
