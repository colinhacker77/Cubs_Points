# Buckshaw ROF Cubs Points

A Netlify-hosted points board for Red, Yellow, Purple and Blue Sixes.

## Pages

- `/` — public/projector display.
- `/leader.html` — leader sign-in and points controls.
- Leaders can add/remove points throughout the meeting; these are saved as **working totals** in Netlify Blobs.
- **Update Totals** copies working totals to the public/projector totals.
- An administrator sees an extra admin section for user management and resetting all points.

## Persistent data

Two Netlify Blob stores are used:

- `cub-points` — working and published six totals.
- `cub-users` — usernames, roles and scrypt password hashes.

No score or user data depends on cookies. The signed login token is kept in `sessionStorage` for the current browser session only.

## First deployment

Set two Netlify environment variables, available to Functions/runtime:

### `AUTH_SECRET`

A long random value used to sign eight-hour login tokens.

Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `ADMIN_PASSWORD`

The initial password for the built-in username:

```text
admin
```

Choose a password of at least 8 characters. On first use the site creates the `admin` account in the Blob user store using a scrypt hash; the plain-text password is not written to the Blob.

After signing in as `admin`, use the **User management** section on `/leader.html` to:

- add leaders or additional administrators;
- rename non-admin users;
- change roles;
- change/reset passwords;
- remove users.

The built-in `admin` username cannot be renamed, removed or demoted, but its password can be changed from the admin screen.

> `ADMIN_PASSWORD` is only a bootstrap value. Once the user Blob exists, changing the environment variable does not change the stored admin password. Use the admin screen to change it.

### Optional legacy migration

If an older deployment still has `LEADER_USERS` configured, those scrypt-hashed users are imported into the Blob user store the first time it is created. New deployments do not need `LEADER_USERS`.

## Reset points

The administrator has a **Reset all points to zero** button. It requires two confirmations and immediately sets both:

- working totals; and
- published/projector totals

to zero.

## Local development

```bash
npm install
npx netlify dev
```

Configure local Netlify environment values for `AUTH_SECRET` and `ADMIN_PASSWORD` before testing sign-in.

## Notes

- Points cannot go below zero.
- The public display is read-only and polls for published changes.
- User passwords are stored only as salted scrypt hashes.
- Removing a user prevents future authenticated requests for that user, even if an old browser still has a token.
- The screenshot-friendly public page can be shared to the parents' WhatsApp group after publishing the meeting totals.


## Term tracking
The app stores Autumn, Spring and Summer separately. Admin selects the current term in the leader page. Public pages display the selected term, while the projector page can also animate the full-year total. Existing pre-v18 points are migrated into Autumn automatically.
