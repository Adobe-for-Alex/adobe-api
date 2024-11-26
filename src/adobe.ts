import { LicenseGroupId, OrganizationId, ProductId, Token, UserId } from './aliases'

export type Organization = {
  id: OrientationType
}

export type Product = {
  id: ProductId
  maxDelegations: number
  delegations: number
  actual: boolean
}

export type User = {
  id: UserId,
  email: string
}

export type LicenceGroup = {
  id: LicenseGroupId
}

export const organizations = async (token: Token): Promise<Organization[]> =>
  (await fetch('https://bps-il.adobe.io/jil-api/v2/organizations/?include=delegation_groups_migration_status%2Crenga_tags%2Crso_values', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': 'ONESIE1',
    }
  }).then(x => x.json())).map((x: any): Organization => ({ id: x.id }))

export const products = async (token: Token, id: OrganizationId): Promise<Product[]> =>
  (await fetch(`https://bps-il.adobe.io/jil-api/v2/organizations/${id}/products/?include_cancellation_data=true&include_created_date=true&include_expired=true&include_groups_quantity=false&include_inactive=false&include_license_activations=true&include_license_allocation_info=false&include_pricing_data=true&includeAcquiredOfferIds=false&includeConfiguredProductArrangementId=false&includeLegacyLSFields=false&processing_instruction_codes=global_administration%2Cadministration`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': 'ONESIE1',
    }
  }).then(x => x.json())).map((x: any): Product => ({
    id: x.id,
    maxDelegations: x.cancellation.cancellableQuantity,
    delegations: x.cancellation.remainingDelegations,
    actual: (+new Date() - Date.parse(x.createdDate)) < (14 * 24 * 3600)
  }))

export const users = async (token: Token, organizationId: OrganizationId, productId: ProductId): Promise<User[]> =>
  (await fetch(`https://bps-il.adobe.io/jil-api/v2/organizations/${organizationId}/products/${productId}/users?filter_exclude_domain=techacct.adobe.com&include=PROVISIONING_STATUS&page=0&page_size=20&search_query=&sort=FNAME_LNAME&sort_order=ASC&currentPage=1&filterQuery=`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': 'ONESIE1',
    }
  }).then(x => x.json())).map((x: any): User => ({
    id: x.id,
    email: x.email
  }))

export const licenseGroups = async (token: Token, organizationId: OrganizationId, productId: ProductId): Promise<LicenceGroup[]> =>
  (await fetch(`https://bps-il.adobe.io/jil-api/v2/organizations/${organizationId}/products/${productId}/license-groups/?page=0&page_size=20&search_query=&sort=&sort_order=`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': 'ONESIE1',
    }
  }).then(x => x.json())).map((x: any): LicenceGroup => ({ id: x.id }))


export const attach = async (
  token: Token,
  organizationId: OrganizationId,
  productId: ProductId,
  licenseGroupId: LicenseGroupId,
  email: string
): Promise<void> => {
  await fetch(`https://bps-il.adobe.io/jil-api/v2/organizations/${organizationId}/users%3Abatch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': 'ONESIE1',
    },
    body: JSON.stringify([
      {
        email,
        products: [
          {
            id: productId,
            licenseGroups: [
              {
                id: licenseGroupId
              }
            ]
          }
        ],
        roles: [],
        type: 'TYPE2E',
        userGroups: []
      }
    ])
  })
}

export const detach = async (
  token: Token,
  organizationId: OrganizationId,
  productId: ProductId,
  licenseGroupId: LicenseGroupId,
  userId: UserId
): Promise<void> => {
  await fetch(`https://bps-il.adobe.io/jil-api/v2/organizations/${organizationId}/users`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': 'ONESIE1',
    },
    body: JSON.stringify([
      {
        op: "remove",
        path: `/${userId}/products/${productId}/licenseGroups/${licenseGroupId}`
      }
    ])
  })
}
