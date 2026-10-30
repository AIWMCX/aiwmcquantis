/** Run: deno test supabase/functions/_shared/commercial/compliance-footer.test.ts */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { postalAddressBlock, withPostalAddress, POSTAL_ADDRESS_MISSING } from "../mail/compliance-footer.ts";

const draft = 'Hi Ann,\n\nBody.\n\nBogdan Jeltov\n\nIf this isn\'t relevant, just reply "no" and I won\'t follow up.';

Deno.test('missing or blank address blocks sending', () => {
  assertEquals(postalAddressBlock(null), POSTAL_ADDRESS_MISSING);
  assertEquals(postalAddressBlock('   '), POSTAL_ADDRESS_MISSING);
  assertEquals(postalAddressBlock('PO Box 1'), POSTAL_ADDRESS_MISSING);
  assertEquals(postalAddressBlock('PO Box 123, Denver, CO 80202'), null);
});

Deno.test('address is appended once, after the opt-out line', () => {
  const out = withPostalAddress(draft, 'PO Box 123\nDenver, CO 80202');
  assert(out.endsWith('\n\nAIWMC Quantis · PO Box 123, Denver, CO 80202'));
  assert(out.indexOf('reply "no"') < out.indexOf('PO Box 123'));
  assertEquals(withPostalAddress(out, 'PO Box 123\nDenver, CO 80202'), out);
});
