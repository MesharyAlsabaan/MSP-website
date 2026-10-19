import { ORG_ID, ceo, offices, organization } from './structured-data';

const UNVERIFIED = ['aggregateRating', 'review', 'award', 'openingHours', 'openingHoursSpecification', 'priceRange', 'numberOfEmployees', 'legalName', 'geo'];

describe('Structured data facts', () => {
  it('offices carry only facts the site publishes, linked to the organization', () => {
    const [riyadh, cairo] = offices();
    expect(riyadh['@type']).toBe('ProfessionalService');
    expect(riyadh['parentOrganization']).toEqual({ '@id': ORG_ID });
    expect(riyadh['telephone']).toBe('+966112000087');
    expect((riyadh['address'] as Record<string, string>)['addressLocality']).toBe('Riyadh');
    expect((cairo['address'] as Record<string, string>)['addressCountry']).toBe('EG');
    for (const node of [organization(), riyadh, cairo, ceo()]) {
      for (const key of UNVERIFIED) expect(node[key], key).toBeUndefined();
    }
  });

  it('the CEO is a Person working for MSP, as named on the About page', () => {
    expect(ceo()).toMatchObject({ '@type': 'Person', name: 'Mansour Al-Sabaan', jobTitle: 'Chief Executive Officer', worksFor: { '@id': ORG_ID } });
  });
});
