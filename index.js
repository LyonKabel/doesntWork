const express = require('express');
const bodyParser = require('body-parser');
const { filterContacts, sortContacts, Pager, ContactModel, InvalidContactError, ContactNotFoundError, DuplicateContactResourceError, InvalidEnumError, PagerOutOfRangeError } = require('@jworkman-fs/asl');

const app = express();
app.use(bodyParser.json());




const validateEnum = (value, allowedValues, errorMessage) => {
  if (!allowedValues.includes(value)) {
    throw new InvalidEnumError(errorMessage);
  }
};

// GET /contacts
app.get('/contacts', (req, res) => {
  try {
    let filteredContacts = contacts;
    const filterBy = req.get('X-Filter-By');
    const filterOperator = req.get('X-Filter-Operator');
    const filterValue = req.get('X-Filter-Value');

    if (filterBy && filterOperator && filterValue) {
      filteredContacts = filterContacts(filteredContacts, filterBy, filterOperator, filterValue);
    }

    const sortBy = req.query.sort || 'fname';
    const sortDirection = req.query.direction || 'asc';
    validateEnum(sortBy, ['fname', 'lname', 'email', 'birthday'], 'Invalid sort field');
    validateEnum(sortDirection, ['asc', 'desc'], 'Invalid sort direction');

    const sortedContacts = sortContacts(filteredContacts, sortBy, sortDirection);

    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    if (size > 20) throw new PagerLimitExceededError();

    const pager = new Pager(sortedContacts, page, size);

    res.set("X-Page-Total", pager.total());
    res.set("X-Page-Next", pager.next());
    res.set("X-Page-Prev", pager.prev());
    res.json(pager.results());
  } catch (error) {
    if (error instanceof InvalidEnumError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof PagerOutOfRangeError) {
      return res.status(416).json({ message: error.message });
    } else if (error instanceof PagerLimitExceededError) {
      return res.status(400).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'An internal error occurred' });
    }
  }
});

// POST /contacts
app.post('/contacts', (req, res) => {
  try {
    const newContact = req.body;
    ContactModel.validate(newContact);
    const duplicate = contacts.find(contact => contact.email === newContact.email);
    if (duplicate) throw new DuplicateContactResourceError();

    const createdContact = ContactModel.create(newContact);
    contacts.push(createdContact);
    res.status(303).redirect(`/contacts/${createdContact.id}`);
  } catch (error) {
    if (error instanceof InvalidContactError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof DuplicateContactResourceError) {
      return res.status(400).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'An internal error occurred' });
    }
  }
});

// GET /contacts/:id
app.get('/contacts/:id', (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) throw new ContactNotFoundError();

    res.json(contact);
  } catch (error) {
    if (error instanceof ContactNotFoundError) {
      return res.status(404).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'An internal error occurred' });
    }
  }
});

// PUT /contacts/:id
app.put('/contacts/:id', (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const updatedContact = req.body;
    ContactModel.validate(updatedContact);

    const contactIndex = contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) throw new ContactNotFoundError();

    contacts[contactIndex] = { ...contacts[contactIndex], ...updatedContact };
    res.status(303).redirect(`/contacts/${contactId}`);
  } catch (error) {
    if (error instanceof InvalidContactError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof ContactNotFoundError) {
      return res.status(404).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'An internal error occurred' });
    }
  }
});

// DELETE /contacts/:id
app.delete('/contacts/:id', (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const contactIndex = contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) throw new ContactNotFoundError();

    contacts.splice(contactIndex, 1);
    res.status(303).redirect('/contacts');
  } catch (error) {
    if (error instanceof ContactNotFoundError) {
      return res.status(404).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'An internal error occurred' });
    }
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
