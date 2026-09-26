import { GENERATED_PASSWORD_LENGTH, generatePassword, handoverText } from '../password';

describe('generatePassword (prompt 51)', () => {
  it('is sixteen readable characters with a letter and a digit', () => {
    for (let run = 0; run < 50; run += 1) {
      const password = generatePassword();
      expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
      expect(password).toMatch(/[a-zA-Z]/);
      expect(password).toMatch(/\d/);
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });

  it('differs from one call to the next', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });

  it('hands over the address and the password together', () => {
    expect(handoverText('priya@example.com', 'Abc23456defg7hjk')).toBe(
      'E-mail: priya@example.com\nTemporary password: Abc23456defg7hjk'
    );
    expect(handoverText('', 'Abc23456defg7hjk')).toBe('Temporary password: Abc23456defg7hjk');
  });
});
