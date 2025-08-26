export async function Paginate<T>(
  modelDelegate: {
    findMany: Function;
    count: Function;
  },
  options: {
    where?: any;
    page?: number | string;
    limit?: number | string;
    include?: any;
    orderBy?: any;
    select?: any;
    all?: boolean;
  },
): Promise<{
  total: number;
  data: T[];
  currentPage: number;
  firstPage: number;
  lastPage: number;
  nextPage: number | null;
  previousPage: number | null;
  limit: number;
}> {
  const { where = {}, include, orderBy, select, all = false } = options;

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Number(options.limit) || 20);
  const skip = (page - 1) * limit;

  let data: T[] = [];
  let total = 0;

  if (all) {
    [data, total] = await Promise.all([
      modelDelegate.findMany({ where, include, orderBy, select }),
      modelDelegate.count({ where }),
    ]);
    return {
      total,
      data,
      currentPage: 1,
      firstPage: 1,
      lastPage: 1,
      nextPage: null,
      previousPage: null,
      limit: total,
    };
  }

  [data, total] = await Promise.all([
    modelDelegate.findMany({
      where,
      skip,
      take: limit,
      include,
      orderBy,
      select,
    }),
    modelDelegate.count({ where }),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / limit));

  return {
    total,
    data,
    currentPage: page,
    firstPage: 1,
    lastPage,
    nextPage: page < lastPage ? page + 1 : null,
    previousPage: page > 1 ? page - 1 : null,
    limit,
  };
}
