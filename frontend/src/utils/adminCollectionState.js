function getCollection(current, collectionKey) {
  const collection = current?.[collectionKey];

  return Array.isArray(collection) ? collection : [];
}

function applyOptionalSort(items, sortItems) {
  return typeof sortItems === "function" ? sortItems(items) : items;
}

export function upsertAdminCollectionItem(setAdminData, collectionKey, item, sortItems) {
  setAdminData((current) => {
    const currentItems = getCollection(current, collectionKey);
    const nextItems = [
      ...currentItems.filter((currentItem) => currentItem.id !== item.id),
      item,
    ];

    return {
      ...current,
      [collectionKey]: applyOptionalSort(nextItems, sortItems),
    };
  });
}

export function replaceAdminCollectionItem(setAdminData, collectionKey, item, sortItems) {
  setAdminData((current) => {
    const currentItems = getCollection(current, collectionKey);
    const nextItems = currentItems.map((currentItem) =>
      currentItem.id === item.id ? item : currentItem
    );

    return {
      ...current,
      [collectionKey]: applyOptionalSort(nextItems, sortItems),
    };
  });
}

export function removeAdminCollectionItem(setAdminData, collectionKey, itemId, sortItems) {
  setAdminData((current) => {
    const currentItems = getCollection(current, collectionKey);
    const nextItems = currentItems.filter((currentItem) => currentItem.id !== itemId);

    return {
      ...current,
      [collectionKey]: applyOptionalSort(nextItems, sortItems),
    };
  });
}
