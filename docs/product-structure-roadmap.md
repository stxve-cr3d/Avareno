# Mavora Product Structure Roadmap

## Product North Star

Mavora is the personal operating system for physical things: every object, document, room, warranty, family member, care task, and reorder need lives in one simple, beautiful place.

The product should feel less like an inventory spreadsheet and more like: "my home finally remembers things for me."

## Core Product Pillars

### 1. Things Library

Everything must be possible, not only electronics.

- Electronics: TV, phone, laptop, headphones, appliances
- Furniture: sofa, bed, table, lamps
- Home infrastructure: boiler, doors, windows, flooring, kitchen equipment
- Vehicles and bikes
- Tools, sports gear, collectibles, clothing, jewelry
- Documents without a physical object yet

Needed structure:

- Item type
- Category
- Brand / manufacturer
- Model
- Serial number
- Photos
- Receipts
- Manuals
- Warranty
- Location
- Ownership status
- Value / purchase price
- Repair history
- Reorder / shop links

### 2. Configurable Spaces

Users need product grouping by how they actually live.

- Home
- Building
- Apartment
- Floor
- Room
- Zone
- Shelf / cabinet / storage box
- Custom collection

Examples:

- Home > Wohnzimmer > TV Wand
- Gebäude > Keller > Werkzeugregal
- Ferienwohnung > Küche
- Büro > Meetingraum

This should be fully configurable. We should not force users into one fixed structure.

### 3. Family And Sharing

Mavora should work for households, not just one person.

Feature needs:

- Invite family members
- Shared home spaces
- Permissions per person
- View only / editor / owner
- Shared reminders
- Activity history
- "Who added this?"
- Private items inside shared households

Important product idea:

Family members should be able to see all shared products, documents, warranty dates, and room organization without needing to ask the main user.

### 4. Capture And Adding Things

This is the most important UX problem. Adding things must be extremely easy.

Possible capture methods:

- Photo of object
- Photo or PDF receipt
- Scan barcode / QR code
- Search product by name
- Forward email receipts
- Import from online shop orders
- Manual quick add
- Voice note
- Message parsing
- Smart home import

Best MVP direction:

One universal "Add" flow that asks as little as possible:

1. User uploads photo, receipt, or text.
2. Mavora detects what it is.
3. Mavora creates a suggested object.
4. User only confirms or edits missing details.

The user should never feel like they are filling out a database.

### 5. Planning And Notifications

Already started in the app.

Needed:

- Warranty reminders
- Return window reminders
- Repair follow-ups
- Maintenance tasks
- Replacement recommendations
- Reorder reminders
- Shared family reminders
- Push notification support
- Snooze / dismiss / complete
- Today view
- Upcoming view

The planner should answer: "What is the one thing I should handle next?"

### 6. Affiliate And Reorder Links

Mavora should make money through helpful reorder paths, not annoying ads.

Needed:

- Product shop link
- Replacement item suggestions
- Accessories
- Consumables
- Warranty extension offers
- Repair service partners
- Affiliate tracking
- Click analytics

Examples:

- Buy the same remote again
- Replace water filter
- Buy matching cable
- Find better current version of old device
- Book repair

Rule:

Affiliate should feel useful, not spammy.

### 7. Free And Premium Model

This is essential for monetization.

Free version:

- Limited number of items
- Basic rooms
- Basic reminders
- Manual add
- One household

Premium:

- Unlimited items
- Family sharing
- Advanced rooms / buildings
- AI extraction
- More document storage
- Smart reminders
- Reorder links and price watch
- Export
- Insurance / emergency reports
- Smart home integrations

Possible higher tier:

- Mavora Home Pro
- Multiple properties
- Landlords / Airbnb / small offices
- Advanced sharing and reports

### 8. Smart Home Integration

This could become a huge differentiator.

Possible integrations:

- Home Assistant
- Apple Home
- Google Home
- Alexa
- Matter devices

Use cases:

- Auto-import known devices
- Detect device names and rooms
- Match physical product with smart device
- Show device status
- Maintenance reminders from usage
- Battery reminders
- Filter replacement reminders

This is probably not MVP, but it is a strong V2/V3 "wow" path.

### 9. Optional Chatter

Chatter is interesting, but we need to be careful.

Good version:

- Item comments
- Family notes
- "Dad repaired this on June 12"
- "Do not throw this away"
- "We need batteries"

Risky version:

- Full chat app inside Mavora
- Too much noise
- Hard to keep focused

Recommendation:

Start with comments/activity per item, not full chat.

## WOW Features

These are the things that could make Mavora feel different.

### Object Memory Timeline

Every item gets a beautiful history:

- Bought
- Receipt added
- Warranty started
- Moved to another room
- Repaired
- Shared
- Sold / archived

### Emergency Home Binder

One tap creates a structured report:

- Important appliances
- Serial numbers
- Receipts
- Warranty
- Insurance-relevant value
- Photos

Great for insurance, moving, fire/water damage, landlords.

### Smart Missing Info

Mavora tells the user:

- "This item is missing a serial number."
- "Add a back photo to complete it."
- "Warranty exists, but no receipt is attached."

### Reorder Intelligence

Mavora knows which items can be reordered or replaced.

- Same product
- Newer model
- Cheaper alternative
- Official accessory

### Home Map / Room View

Instead of a boring list:

- Browse by room
- Browse by building
- Visual cards
- Object clusters

### AI Object Assistant

User asks:

- "Where is my TV receipt?"
- "Which warranties expire soon?"
- "What do I need to repair?"
- "Show all things in the living room."
- "What did we buy from MediaMarkt?"

## Suggested Roadmap

### MVP Plus

- Better item model for all object types
- Spaces: home, room, custom groups
- Planner and notifications
- Simple sharing architecture
- Reorder/shop link field
- Premium gates in data model

### V1

- Family invite flow
- Configurable buildings / rooms / groups
- Universal add flow
- Premium/free limits
- Affiliate link tracking
- Item comments/activity

### V2

- AI assistant
- Smart home import
- Price/reorder intelligence
- Insurance reports
- Multi-property support

## Immediate Next Build Steps

1. Add database models for spaces, households, memberships, plans, affiliate links, and item activity.
2. Update item creation so every item can belong to a configurable space.
3. Build a room/group filter UI on the Things page.
4. Add a premium/free feature flag layer.
5. Add reorder/shop link fields to item detail.
6. Create the first simple sharing model for household members.
7. Redesign the add flow into one universal capture screen.
