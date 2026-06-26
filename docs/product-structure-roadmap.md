# Avareno Product Structure Roadmap

## Product North Star

Avareno is the personal operating system for physical things: every object, document, room, warranty, family member, care task, and reorder need lives in one simple, beautiful place.

The product should feel less like an inventory spreadsheet and more like: "my home finally remembers things for me."

Key product sentence:

> Avareno macht aus deinen echten Dingen ein intelligentes Gedächtnis.

Stronger English version:

> Avareno turns real life into something you can finally manage.

Focus rule:

Avareno can become very large, but only if the roadmap avoids feature chaos. The MVP must stay focused on one core promise: every real object gets a useful Product Passport and help when something goes wrong.

## Version Roadmap

### MVP

1. Product Passport
2. Manuals, drivers, software, warranty, receipt, serial number
3. Repair Log basic
4. Support-Autopilot basic

MVP outcome:

- A user can add a real product.
- Avareno stores the receipt, warranty, manual, software/driver links, serial number, and notes.
- Avareno tracks basic repairs and issues.
- If something breaks, Avareno prepares a support request from the product passport.

### Version 2

5. Compatibility Graph
6. Family Vault
7. Accessories, replacement parts, and 3D models

V2 outcome:

- Avareno understands how products connect.
- A household, family, or shared flat can manage important devices and documents together.
- Avareno helps users find parts, accessories, compatible add-ons, and printable/replaceable components.

### Version 3

8. Before You Buy
9. Quests
10. Rankings, streaks, profile, and social

V3 outcome:

- Avareno can advise before a purchase.
- Users get small useful quests instead of random to-dos.
- Streaks and profile features create motivation without turning the product into a noisy game.

## Strategic Feature Map

### Product Passport

The core object view.

Each product should collect:

- Receipt
- Warranty
- Manual
- Drivers
- Software
- Serial number
- Product photos
- Notes
- Support history
- Repair history

### Avareno Fits

Useful fits around a product:

- Accessories
- Replacement parts
- 3D models
- Price comparison
- Compatible versions
- Official and third-party add-ons

### Avareno Print

If the user does not own a 3D printer, Avareno can prepare a request to a print service.

Possible flow:

1. User finds a broken or missing part.
2. Avareno finds or generates a compatible 3D model reference.
3. Avareno prepares a print request.
4. User sends it to a print service.

### Avareno Skills

Products can unlock useful modes.

Examples:

- Dartboard becomes a scoreboard.
- Airfryer gets recipes.
- Poker set becomes a tournament manager.
- Router becomes a family network hub.
- TV becomes a warranty/support center.

Rule:

Skills should feel like product-specific tools, not generic widgets.

### Avareno Family Vault

Shared product memory for household, family, or shared flat.

Everyone can see important shared things:

- Router
- Appliances
- Insurance-relevant devices
- Receipts
- Warranty dates
- Manuals
- Support cases
- Repair notes

### Avareno Loops

Open real-life threads:

- Open promises
- Returns
- Warranty checks
- Support cases
- Repair follow-ups
- Missing serial numbers
- Replacement orders

Loops should be attached to real things whenever possible.

### Repair Log

Every product gets a repair and issue history.

Basic entries:

- Date
- Problem
- Photos
- Cost
- Service/contact
- Status
- Notes
- Related receipt or warranty

### Support-Autopilot

When something breaks, Avareno prepares the support request.

Inputs:

- Product Passport
- Serial number
- Receipt
- Warranty
- Error description
- Repair history
- Photos

Output:

- Support email/message draft
- Warranty claim summary
- Attachment checklist
- Next action loop

### Compatibility Graph

Avareno connects products with each other.

Examples:

- Router works with smart home devices.
- TV needs compatible wall mount, remote, cables, streaming box.
- Airfryer has compatible baskets and recipes.
- Laptop has compatible charger, dock, monitor, adapters.

### Avareno Before You Buy

Stronger than price comparison.

Flow:

1. User photographs a product in a store or uploads an online screenshot.
2. Avareno compares it with the user's existing things.
3. Avareno says: "Du hast schon etwas Ähnliches."
4. Avareno warns about duplicates, incompatibility, missing accessories, or better fits.

### Avareno Quests

Small task packages instead of random to-dos.

Examples:

- Garantie-Quest: store 3 receipts and secure 3 warranties.
- Repair-Quest: document one broken item and prepare a support case.
- Family-Quest: add the router, washing machine, and TV to the shared vault.
- Move-Quest: build an emergency home binder.

### Streaks And Profile

Personal progress should be motivating, not stressful.

Needed:

- Personal profile
- Streaks for useful care actions
- XP and level
- Weekly progress
- Gentle recovery after missed days
- Optional rankings/social later

Tone rule:

Never punish the user for not doing admin work. Reward useful care and make the home feel more manageable.

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

Avareno should work for households, not just one person.

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
2. Avareno detects what it is.
3. Avareno creates a suggested object.
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

Avareno should make money through helpful reorder paths, not annoying ads.

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

- Avareno Home Pro
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

- Full chat app inside Avareno
- Too much noise
- Hard to keep focused

Recommendation:

Start with comments/activity per item, not full chat.

## WOW Features

These are the things that could make Avareno feel different.

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

Avareno tells the user:

- "This item is missing a serial number."
- "Add a back photo to complete it."
- "Warranty exists, but no receipt is attached."

### Reorder Intelligence

Avareno knows which items can be reordered or replaced.

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

### MVP: Product Passport First

- Product Passport model for real products
- Receipt, warranty, manual, drivers/software, serial number
- Basic Repair Log
- Basic Support-Autopilot
- Universal capture that creates or updates a Product Passport

### Version 2: Shared And Connected

- Compatibility Graph
- Family Vault
- Accessories and replacement parts
- 3D model references
- Avareno Print request flow
- Room/space organization

### Version 3: Purchase Intelligence And Motivation

- Before You Buy
- Quests
- Personal profile
- Streaks
- Rankings/social
- Smart home and richer product Skills

## Immediate Next Build Steps

1. Harden Product Passport fields on item detail: receipt, warranty, manual, drivers/software, serial number, notes.
2. Add Repair Log basic to each product.
3. Build Support-Autopilot basic: generate a support request draft from passport data.
4. Keep Universal Capture focused on creating or updating Product Passports.
5. Add first manual/driver/software link fields before building broader compatibility features.
6. Add Family Vault only after the single-user Product Passport feels useful.
7. Add Quests/Streaks after the core care actions are already meaningful.
